/**
 * Jobab eval runner (spec §13).
 *
 *   pnpm eval                    # runs every cases/*.yaml, prints score
 *   pnpm eval cases/price.yaml   # one file
 *   pnpm eval --json out.json    # machine-readable output
 *
 * Each case has the shape:
 *
 *   id: "price-001"
 *   description: "Customer asks price in Banglish"
 *   merchant_setup:
 *     products:
 *       - external_id: lal_jamdani
 *         title: Lal Jamdani Shari
 *         price: 1650
 *         variants:
 *           - { name: Medium, stock: 5 }
 *   conversation:
 *     - { role: customer, text: "lal jamdani shari koto?" }
 *   expectations:
 *     - { kind: tool_called, tool: search_catalog }
 *     - { kind: reply_contains, all: ["1650"] }
 *     - { kind: reply_excludes, any: ["[stub", "I don't know"] }
 *     - { kind: language, must_be_one_of: [banglish, bangla, english] }
 *
 * The runner spins a fresh organisation per case (deterministic id), seeds
 * the catalog, drives the conversation through the same agent pipeline the
 * webhook uses, then evaluates each expectation. Results are aggregated
 * into a single quality score.
 *
 * This script intentionally avoids brittle exact-string matches — it uses
 * keyword presence / absence + a structural language check. For deeper
 * semantic evaluation, swap the `language` and `reply_quality` evaluators
 * for an LLM-as-judge pass (Spec §13 calls this out explicitly).
 */

import { NestFactory } from '@nestjs/core';
import { Module, Logger } from '@nestjs/common';
import { readFile, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { argv, exit, stdout } from 'node:process';
import yaml from 'js-yaml';
import { EnvModule } from '../src/config/env.module';
import { EncryptionModule } from '../src/common/encryption/encryption.module';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { QueueModule } from '../src/queue/queue.module';
import { VisionModule } from '../src/vision/vision.module';
import { EmbeddingsModule } from '../src/embeddings/embeddings.module';
import { CatalogModule } from '../src/catalog/catalog.module';
import { MessengerModule } from '../src/messenger/messenger.module';
import { PaymentsModule } from '../src/payments/payments.module';
import { OrdersModule } from '../src/orders/orders.module';
import { AgentModule } from '../src/agent/agent.module';
import { AgentService } from '../src/agent/agent.service';

@Module({
  imports: [
    EnvModule,
    EncryptionModule,
    PrismaModule,
    QueueModule,
    VisionModule,
    EmbeddingsModule,
    CatalogModule,
    MessengerModule,
    PaymentsModule,
    OrdersModule,
    AgentModule,
  ],
})
class EvalModule {}

interface EvalCase {
  id: string;
  description?: string;
  merchant_setup: {
    ai_instructions?: string;
    products: Array<{
      external_id: string;
      title: string;
      description?: string;
      price: number;
      variants: Array<{ name: string; stock: number; price?: number }>;
    }>;
  };
  conversation: Array<{ role: 'customer'; text: string; image_url?: string }>;
  expectations: Array<
    | { kind: 'tool_called'; tool: string }
    | { kind: 'tool_not_called'; tool: string }
    | { kind: 'reply_contains'; all: string[] }
    | { kind: 'reply_excludes'; any: string[] }
    | { kind: 'order_created'; required_total?: number }
    | { kind: 'no_order'; reason?: 'missing_fields' | 'duplicate' | 'out_of_stock' }
    | { kind: 'language'; must_be_one_of: Array<'bangla' | 'banglish' | 'english'> }
  >;
}

interface CaseResult {
  caseId: string;
  description?: string;
  totalChecks: number;
  passed: number;
  failed: string[];
  finalReply?: string;
  toolsCalled: string[];
  latencyMs: number;
  costUsd: number;
  error?: string;
}

const log = new Logger('eval');

async function loadCases(): Promise<EvalCase[]> {
  const args = argv.slice(2).filter((a) => !a.startsWith('--'));
  const files: string[] = [];
  if (args.length > 0) {
    files.push(...args.map((a) => resolve(a)));
  } else {
    const dir = resolve(__dirname, 'cases');
    for (const name of await readdir(dir)) {
      if (name.endsWith('.yaml') || name.endsWith('.yml')) files.push(join(dir, name));
    }
  }
  const cases: EvalCase[] = [];
  for (const f of files) {
    const raw = await readFile(f, 'utf8');
    const docs = yaml.loadAll(raw) as EvalCase[];
    for (const d of docs) if (d?.id) cases.push(d);
  }
  return cases;
}

async function seedFixture(prisma: PrismaService, c: EvalCase) {
  const orgId = `eval_${c.id}`;
  const pageId = `eval_p_${c.id}`;

  await prisma.organization.upsert({
    where: { id: orgId },
    update: { aiInstructions: c.merchant_setup.ai_instructions ?? null },
    create: {
      id: orgId,
      name: `Eval ${c.id}`,
      status: 'active',
      catalogSource: 'csv',
      aiInstructions:
        c.merchant_setup.ai_instructions ??
        'You are the merchant. Reply in the customer\'s language. Use search_catalog before quoting any price.',
    },
  });
  await prisma.page.upsert({
    where: { platform_externalPageId: { platform: 'facebook', externalPageId: pageId } },
    update: { organizationId: orgId },
    create: {
      id: pageId,
      organizationId: orgId,
      platform: 'facebook',
      externalPageId: pageId,
      accessToken: 'dev-token-not-used-in-fake-mode',
      status: 'connected',
      webhookSubscribed: true,
    },
  });
  // wipe + seed products
  await prisma.product.deleteMany({ where: { organizationId: orgId } });
  for (const p of c.merchant_setup.products) {
    const created = await prisma.product.create({
      data: {
        organizationId: orgId,
        externalId: p.external_id,
        title: p.title,
        description: p.description,
        price: p.price,
        currency: 'BDT',
      },
    });
    for (const v of p.variants) {
      await prisma.productVariant.create({
        data: {
          productId: created.id,
          name: v.name,
          price: v.price ?? p.price,
          stockQty: v.stock,
        },
      });
    }
  }
  return { orgId, pageId };
}

async function runCase(
  agent: AgentService,
  prisma: PrismaService,
  c: EvalCase,
): Promise<CaseResult> {
  const start = Date.now();
  const { orgId, pageId } = await seedFixture(prisma, c);

  // Drive each customer turn, letting the agent reply after each.
  let lastConversationId: string | null = null;
  const toolsCalled: string[] = [];
  let totalCost = 0;
  let finalReply = '';
  let runError: string | undefined;

  for (let i = 0; i < c.conversation.length; i++) {
    const turn = c.conversation[i];
    const externalUserId = `eval_cust_${c.id}`;

    const conv = await prisma.conversation.upsert({
      where: { pageId_externalUserId: { pageId, externalUserId } },
      update: { lastCustomerMessageAt: new Date() },
      create: {
        organizationId: orgId,
        pageId,
        externalUserId,
        status: 'bot',
        lastCustomerMessageAt: new Date(),
      },
    });
    lastConversationId = conv.id;

    const msg = await prisma.message.create({
      data: {
        conversationId: conv.id,
        direction: 'in',
        sender: 'customer',
        content: turn.text,
        attachments: turn.image_url ? { images: [turn.image_url] } : undefined,
      },
    });

    try {
      await agent.handleMessage(conv.id, msg.id);
    } catch (err) {
      runError = (err as Error).message;
      break;
    }
  }

  if (lastConversationId) {
    const runs = await prisma.agentRun.findMany({
      where: { conversationId: lastConversationId },
      orderBy: { createdAt: 'asc' },
    });
    for (const r of runs) {
      totalCost += Number(r.costUsd);
      const calls = (r.toolCalls as { calls?: Array<{ name: string }> } | null)?.calls ?? [];
      for (const call of calls) toolsCalled.push(call.name);
    }
    const last = await prisma.message.findFirst({
      where: { conversationId: lastConversationId, direction: 'out' },
      orderBy: { createdAt: 'desc' },
    });
    finalReply = last?.content ?? '';
  }

  // ── evaluate expectations ──────────────────────────────────────────────
  const failed: string[] = [];
  let passed = 0;
  for (const exp of c.expectations) {
    const [ok, label] = await checkExpectation(prisma, c, exp, {
      conversationId: lastConversationId,
      finalReply,
      toolsCalled,
    });
    if (ok) passed++;
    else failed.push(label);
  }

  return {
    caseId: c.id,
    description: c.description,
    totalChecks: c.expectations.length,
    passed,
    failed,
    finalReply,
    toolsCalled,
    latencyMs: Date.now() - start,
    costUsd: totalCost,
    error: runError,
  };
}

async function checkExpectation(
  prisma: PrismaService,
  c: EvalCase,
  exp: EvalCase['expectations'][number],
  ctx: { conversationId: string | null; finalReply: string; toolsCalled: string[] },
): Promise<[boolean, string]> {
  switch (exp.kind) {
    case 'tool_called':
      return [
        ctx.toolsCalled.includes(exp.tool),
        `tool_called(${exp.tool}) — called: [${ctx.toolsCalled.join(', ')}]`,
      ];
    case 'tool_not_called':
      return [
        !ctx.toolsCalled.includes(exp.tool),
        `tool_not_called(${exp.tool}) — called: [${ctx.toolsCalled.join(', ')}]`,
      ];
    case 'reply_contains': {
      const lower = ctx.finalReply.toLowerCase();
      const missing = exp.all.filter((s) => !lower.includes(s.toLowerCase()));
      return [missing.length === 0, `reply_contains(all=[${exp.all.join(', ')}]) — missing: [${missing.join(', ')}]`];
    }
    case 'reply_excludes': {
      const lower = ctx.finalReply.toLowerCase();
      const found = exp.any.filter((s) => lower.includes(s.toLowerCase()));
      return [found.length === 0, `reply_excludes — found forbidden: [${found.join(', ')}]`];
    }
    case 'order_created': {
      if (!ctx.conversationId) return [false, 'order_created — no conversation'];
      const order = await prisma.order.findFirst({
        where: { conversationId: ctx.conversationId },
      });
      if (!order) return [false, 'order_created — no order in DB'];
      if (exp.required_total && Number(order.total) !== exp.required_total) {
        return [false, `order_created — total mismatch (expected ${exp.required_total}, got ${order.total})`];
      }
      return [true, 'order_created'];
    }
    case 'no_order': {
      if (!ctx.conversationId) return [true, 'no_order — no conversation'];
      const order = await prisma.order.findFirst({
        where: { conversationId: ctx.conversationId },
      });
      return [!order, `no_order — found order ${order?.id ?? ''}`];
    }
    case 'language': {
      const lang = detectLanguage(ctx.finalReply);
      return [
        exp.must_be_one_of.includes(lang),
        `language(${exp.must_be_one_of.join('|')}) — detected: ${lang}`,
      ];
    }
  }
}

function detectLanguage(text: string): 'bangla' | 'banglish' | 'english' {
  const bangla = /[ঀ-৿]/.test(text);
  const latin = /[a-zA-Z]/.test(text);
  if (bangla && !latin) return 'bangla';
  if (bangla && latin) return 'banglish';
  return 'english';
}

async function cleanup(prisma: PrismaService, c: EvalCase) {
  const orgId = `eval_${c.id}`;
  await prisma.organization.deleteMany({ where: { id: orgId } });
}

async function main() {
  const jsonOut = argv.includes('--json')
    ? argv[argv.indexOf('--json') + 1]
    : null;

  const cases = await loadCases();
  if (cases.length === 0) {
    log.error('no eval cases found');
    exit(1);
  }

  const app = await NestFactory.createApplicationContext(EvalModule, { abortOnError: false, logger: false });
  const agent = app.get(AgentService);
  const prisma = app.get(PrismaService);

  const results: CaseResult[] = [];
  for (const c of cases) {
    stdout.write(`  · ${c.id.padEnd(28)} `);
    try {
      const r = await runCase(agent, prisma, c);
      results.push(r);
      const pct = ((r.passed / r.totalChecks) * 100).toFixed(0);
      stdout.write(`${r.passed}/${r.totalChecks} (${pct}%)  ${(r.latencyMs / 1000).toFixed(1)}s  $${r.costUsd.toFixed(5)}\n`);
      for (const f of r.failed) stdout.write(`        ✗ ${f}\n`);
    } catch (err) {
      stdout.write(`ERROR ${(err as Error).message}\n`);
    } finally {
      await cleanup(prisma, c);
    }
  }

  const totalChecks = results.reduce((a, r) => a + r.totalChecks, 0);
  const totalPassed = results.reduce((a, r) => a + r.passed, 0);
  const totalCost = results.reduce((a, r) => a + r.costUsd, 0);
  const avgLatency = results.reduce((a, r) => a + r.latencyMs, 0) / Math.max(1, results.length);
  const score = totalChecks === 0 ? 0 : (totalPassed / totalChecks) * 100;

  stdout.write('\n');
  stdout.write(`────────────────────────────────────────\n`);
  stdout.write(`  cases       : ${results.length}\n`);
  stdout.write(`  checks pass : ${totalPassed}/${totalChecks}\n`);
  stdout.write(`  score       : ${score.toFixed(1)}%\n`);
  stdout.write(`  avg latency : ${(avgLatency / 1000).toFixed(2)}s\n`);
  stdout.write(`  total cost  : $${totalCost.toFixed(4)}\n`);
  stdout.write(`────────────────────────────────────────\n`);

  if (jsonOut) {
    const { writeFile } = await import('node:fs/promises');
    await writeFile(jsonOut, JSON.stringify({ results, score }, null, 2));
    stdout.write(`  wrote ${jsonOut}\n`);
  }

  await app.close();
  // Non-zero exit if score under threshold so CI can gate
  exit(score < 70 ? 1 : 0);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  exit(1);
});
