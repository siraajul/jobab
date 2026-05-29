import { Injectable, Logger } from '@nestjs/common';
import { Direction, Sender } from '@prisma/client';
import { EnvService } from '../config/env.service';
import { PrismaService } from '../prisma/prisma.service';
import { CatalogService } from '../catalog/catalog.service';
import { MessengerService } from '../messenger/messenger.service';
import { OrderGuardrail } from '../orders/order.guardrail';
import { GroqProvider } from './llm/groq.provider';
import { GroqVisionProvider } from '../vision/groq-vision.provider';
import { JinaEmbeddingProvider } from '../embeddings/jina.provider';
import { LangfuseService } from '../observability/langfuse.service';
import { captureError } from '../observability/sentry';
import { WhatsAppService } from '../notifications/whatsapp.service';
import { LlmMessage, LlmProvider, LlmToolCall } from './llm/provider';
import { TOOLS, TOOL_BY_NAME } from './tools/registry';
import { ToolContext } from './tools/types';

/**
 * Per-message agent loop (spec §4).
 *  load context → call LLM → if tool_calls: execute → loop (≤ N) → reply.
 */
@Injectable()
export class AgentService {
  private readonly log = new Logger(AgentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: CatalogService,
    private readonly messenger: MessengerService,
    private readonly guardrail: OrderGuardrail,
    private readonly llm: GroqProvider, // swap via DI when more providers exist
    private readonly vision: GroqVisionProvider,
    private readonly embeddings: JinaEmbeddingProvider,
    private readonly env: EnvService,
    private readonly trace: LangfuseService,
    private readonly whatsapp: WhatsAppService,
  ) {}

  async handleMessage(conversationId: string, messageId: string): Promise<void> {
    const started = Date.now();
    const conversation = await this.prisma.conversation.findUniqueOrThrow({
      where: { id: conversationId },
      include: { organization: true },
    });

    // Bail if the merchant has taken over.
    if (conversation.status === 'human' || conversation.status === 'closed') return;

    const history = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 40,
    });

    const messages: LlmMessage[] = [
      { role: 'system', content: this.buildSystemPrompt(conversation.organization.aiInstructions) },
      ...history.map<LlmMessage>((m) => {
        // Surface image attachments to the model. The vision-LLM call lives
        // inside match_product_by_image; we just need the model to know an
        // image exists so it triggers that tool.
        let content = m.content;
        if (m.sender === 'customer' && m.attachments) {
          const att = m.attachments as { images?: string[] } | null;
          if (att?.images?.length) {
            const tag = att.images
              .map((u, i) => `[customer image ${i + 1}: ${u}]`)
              .join('\n');
            content = (content ? content + '\n' : '') + tag;
          }
        }
        return {
          role: m.sender === 'customer' ? 'user' : 'assistant',
          content,
        };
      }),
    ];

    const ctx: ToolContext = {
      organizationId: conversation.organizationId,
      conversationId: conversation.id,
      prisma: this.prisma,
      catalog: this.catalog,
      guardrail: this.guardrail,
      vision: this.vision,
      embeddings: this.embeddings,
      whatsapp: this.whatsapp,
    };

    const provider: LlmProvider = this.llm;
    const model = this.env.get('LLM_MODEL');
    const maxIters = this.env.get('LLM_MAX_ITERATIONS');
    const maxOutputTokens = this.env.get('LLM_MAX_OUTPUT_TOKENS');

    const toolCallLog: Array<{ name: string; arguments: unknown; result: unknown; error?: string }> = [];
    let inputTokens = 0;
    let outputTokens = 0;
    let costUsd = 0;
    let finalText: string | undefined;
    let loopError: string | undefined;

    const traceCtx = this.trace.startTrace('agent.run', {
      conversationId,
      organizationId: conversation.organizationId,
      model,
    });

    try {
      for (let iter = 0; iter < maxIters; iter++) {
        const result = await provider.call({
          model,
          messages,
          tools: TOOLS.map((t) => t.definition),
          maxOutputTokens,
        });
        inputTokens += result.inputTokens;
        outputTokens += result.outputTokens;
        costUsd += result.costUsd;

        this.trace.logGeneration(traceCtx, {
          name: `iter-${iter}`,
          model,
          input: messages,
          output: result.text ?? result.toolCalls,
          usage: {
            input: result.inputTokens,
            output: result.outputTokens,
            total: result.inputTokens + result.outputTokens,
          },
        });

        if (result.toolCalls.length === 0) {
          finalText = result.text ?? '';
          break;
        }
        // OpenAI-shape APIs need the assistant's tool-call request in history
        // before the tool responses, so the model can correlate ids.
        messages.push({
          role: 'assistant',
          content: result.text ?? '',
          toolCalls: result.toolCalls,
        });
        for (const call of result.toolCalls) {
          const out = await this.executeToolCall(call, ctx);
          this.trace.logToolCall(traceCtx, { name: call.name, input: call.arguments, output: out });
          toolCallLog.push({ name: call.name, arguments: call.arguments, result: out });
          messages.push({
            role: 'tool',
            name: call.name,
            toolCallId: call.id,
            content: JSON.stringify(out),
          });
        }
      }
    } catch (err) {
      loopError = (err as Error).message;
      this.log.error(`agent loop failed (conv=${conversationId}): ${loopError}`);
      captureError(err, { conversationId, model });
    } finally {
      // Always record the run — even on failure — so we can diagnose later.
      await this.prisma.agentRun.create({
        data: {
          conversationId,
          messageId,
          model,
          inputTokens,
          outputTokens,
          costUsd,
          toolCalls: { calls: toolCallLog, ...(loopError ? { error: loopError } : {}) } as unknown as object,
          latencyMs: Date.now() - started,
        },
      });
      this.trace.endTrace(traceCtx, { finalText, error: loopError, cost: costUsd });
    }

    if (finalText && finalText.trim().length > 0) {
      // Surface the latest image-match result (if any) on the outgoing message
      // so the inbox UI can render the candidate cards under the bubble.
      const matchCall = [...toolCallLog]
        .reverse()
        .find((c) => c.name === 'match_product_by_image');
      let outAttachments: Record<string, unknown> | undefined;
      if (matchCall) {
        const r = matchCall.result as
          | { matches?: Array<{ product_id: string; title: string; score: number }>; confident?: boolean }
          | null;
        if (r?.matches && r.matches.length > 0) {
          // Hydrate the candidate image URLs from the catalog.
          const products = await this.prisma.product.findMany({
            where: { id: { in: r.matches.map((m) => m.product_id) } },
            select: { id: true, imageUrl: true },
          });
          const urlById = new Map(products.map((p) => [p.id, p.imageUrl]));
          outAttachments = {
            candidates: r.matches.map((m) => ({
              ...m,
              image_url: urlById.get(m.product_id) ?? null,
            })),
            matchConfident: !!r.confident,
          };
        }
      }
      await this.messenger.sendText(conversationId, finalText, outAttachments);
    } else if (loopError) {
      // Throwing makes BullMQ retry per the backoff config.
      throw new Error(loopError);
    }
  }

  private async executeToolCall(call: LlmToolCall, ctx: ToolContext): Promise<unknown> {
    const tool = TOOL_BY_NAME.get(call.name);
    if (!tool) return { error: `unknown_tool:${call.name}` };
    try {
      return await tool.execute(call.arguments, ctx);
    } catch (err) {
      this.log.warn(`tool ${call.name} failed: ${(err as Error).message}`);
      return { error: 'tool_failed', message: (err as Error).message };
    }
  }

  private buildSystemPrompt(orgInstructions: string | null | undefined): string {
    // Cache-friendly: keep this string stable across turns so prompt caching kicks in (§4, §14).
    return [
      'You are Jobab, an AI sales agent for a Bangladeshi social-commerce merchant.',
      'Reply in the customer\'s language — Bangla, Banglish, or English. Match their register and tone.',
      '',
      'Hard rules:',
      '1. ALWAYS call search_catalog BEFORE quoting any price, size, color, or stock claim.',
      '2. If search_catalog returns an empty array, do NOT guess a price or product. Ask the customer for more detail (color, size, occasion) and search again, OR call handoff_to_human if you cannot resolve.',
      '3. Only use prices and variant names that appear in the search_catalog result. Quote prices exactly as returned.',
      '4. Collect customer name, phone, AND full delivery address before calling create_order. The order will be rejected if any are missing.',
      '5. If create_order returns an error, do not retry blindly — read the error and ask the customer for whatever is missing.',
      '6. On complaints, refund/return requests, payment disputes, or when the customer asks for a human, call handoff_to_human immediately — and set `category` accurately (complaint / refund / payment_dispute / asked_for_human), since the merchant triages by it.',
      '7. When the customer message contains a "[customer image …]" tag, IMMEDIATELY call match_product_by_image with the URL. If `confident: true`, tell the customer the matched product. If not, list the top 2 candidates and ask "Apa ei tar moddhe konta?" — never guess.',
      '8. When the message starts with "[from comment on post …]", treat it like a warm intro: greet briefly, ask what they would like to know, and use the listed intent (price/buy/question) to anticipate (e.g. for price → run search_catalog).',
      '',
      'Merchant instructions:',
      orgInstructions?.trim() || '(none)',
    ].join('\n');
  }
}
