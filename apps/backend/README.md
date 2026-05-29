# Jobab Backend (Phase 1)

NestJS + Prisma + BullMQ skeleton for the AI sales agent, scoped to **Phase 1**
of the build spec (`/BUILD_SPEC.md`): Meta webhook ingest, agent loop with
tool calling, deterministic order guardrail, swappable LLM provider, catalog
search (text), and per-message cost logging.

## Layout
```
src/
  main.ts                  API entrypoint (Express + raw body on /webhooks/meta)
  app.module.ts            Wires every feature module
  prisma/                  PrismaService + Prisma module
  queue/                   BullMQ producer (AGENT_QUEUE)
  webhooks/
    meta.controller.ts     GET verify + POST receive (X-Hub-Signature-256)
    meta-webhook.service.ts upserts conversation + message, enqueues agent
  agent/
    agent.service.ts       The loop: build context → LLM → tools → reply
    worker.ts              Standalone BullMQ worker (npm run start:worker)
    llm/                   LlmProvider interface + Gemini stub
    tools/                 search_catalog, check_stock, save_customer_detail,
                           create_order (guarded), handoff_to_human
  orders/
    order.guardrail.ts     §6 guardrail — fields, stock, total, persist
  catalog/
    catalog.service.ts     ILIKE search (swap for pgvector in Phase 2)
    adapters/              csv (real), shopify + woo (stubs)
  messenger/
    messenger.service.ts   Send API stub with 24h window enforcement
prisma/schema.prisma       §3 schema (multi-tenant, RBAC-ready, pgvector)
```

## Boot
```
cp .env.example .env       # fill in DATABASE_URL, REDIS_URL, META_*, LLM_*
npm install
npm run prisma:generate
npm run prisma:migrate
npm run start:dev          # API on :3000
npm run start:worker:dev   # in another shell — drains AGENT_QUEUE
npm test                   # guardrail + signature unit tests
```

## Not yet implemented (intentional)
- `GeminiProvider.call` — wire to Gemini Generative API; interface is final.
- `ShopifyAdapter`, `WooAdapter` — interface defined, fetchers TODO.
- `MessengerService.sendText` — currently logs + records the outgoing message;
  swap the stub log for a real `fetch` to `graph.facebook.com`.
- Auth + RBAC — Phase 2 (§11). `users`, `memberships`, `assigned_user_id`
  exist in the schema so the API layer can drop in later.
- Image embeddings + `match_product_by_image` — Phase 2 (§9).
- Push notifications — Phase 2 (§12). `device_tokens` table is in place.

## Things only a human can do (per spec §17)
- Meta App Review + Business Verification.
- Privacy policy + data-deletion endpoint hosting.
- LLM eval set construction from real merchant conversations (§13).
