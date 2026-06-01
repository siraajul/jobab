# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Jobab** — an AI sales agent for Bangladeshi social-commerce merchants, plus a real-time
merchant dashboard. A merchant connects a Facebook / Instagram / WhatsApp page; the AI replies
to customer DMs in Bangla / Banglish / English, recognises products from photos, searches the
catalog, takes orders, generates a bKash link, and hands off to a human on complaints. Merchants
watch and intervene from a live inbox.

pnpm monorepo, Node 20+, pnpm 9+.

```
apps/backend    NestJS 10 API + agent worker (Postgres + pgvector, Redis/BullMQ, Groq LLM)
apps/web        Next.js 14 (App Router) + Tailwind — the dashboard
apps/mobile     Expo SDK 51 — Phase 2 scaffold, not active
apps/docs       VitePress wrapper for /docs
packages/shared Zod schemas + types both apps depend on (the cross-network contract)
```

## Read these first

- **`ARCHITECTURE.md`** — the full map. Read it before non-trivial work; it has the agent loop,
  the data model, the backend/frontend patterns, and a worked "add a feature in 7 steps."
- **`README.md`** — product overview + 60-second quickstart.
- **`docs/`** — deep dives (setup, API guide, tech-stack rationale, Meta setup, status).
  Index at `docs/README.md`.

## Commands

Run from repo root unless noted. `pnpm -r` fans out across workspaces.

```bash
# Setup (first time)
pnpm infra:up                                   # Postgres (pgvector) + Redis in Docker
pnpm install
pnpm --filter @jobab/shared build               # build the shared contract first
pnpm --filter @jobab/backend prisma:generate
pnpm --filter @jobab/backend prisma:deploy      # apply migrations
pnpm --filter @jobab/backend seed

# Dev — three processes, one terminal each (or `pnpm run up` to launch all three)
pnpm --filter @jobab/backend start:dev          # API :3000, Swagger at /docs
pnpm --filter @jobab/backend start:worker:dev   # agent worker (drains BullMQ, runs LLM loop)
pnpm --filter @jobab/web dev                    # dashboard :3001

# Quality gates (run before committing)
pnpm typecheck            # tsc --noEmit across all packages
pnpm lint                 # eslint + prettier --check
pnpm test                 # jest across apps
pnpm build                # build all packages

# Single test
pnpm --filter @jobab/backend test -- agent.service.spec.ts      # by file
pnpm --filter @jobab/backend test -- -t "matches by image"     # by test name
pnpm --filter @jobab/web test -- OrderCard.test.tsx
pnpm --filter @jobab/web test:e2e                               # Playwright (apps/web/e2e/)

# Database
pnpm --filter @jobab/backend prisma:migrate     # create + apply a dev migration
pnpm --filter @jobab/backend prisma:reset       # wipe + re-migrate + re-seed

# Exercise the full agent loop with a fake customer DM
DEFAULT_PAGE_ID=page_rongdhonu pnpm --filter @jobab/backend send -- \
  --customer fb_tahmina "lal jamdani shari ache? medium lagbe"
```

`pnpm run up` (not `pnpm up` — that's pnpm's update alias) runs `scripts/up.sh`: infra +
migrations + all three dev processes together.

## The architecture that matters

**Two backend processes, one codebase, a queue between them.** Meta requires a webhook `200 OK`
within ~200ms, but an AI reply takes 2–5s. So the **API** (`src/main.ts`) only stores the message
and enqueues a BullMQ job; the **worker** (`src/agent/worker.ts`) drains the queue and runs the
LLM loop. Both boot the same NestJS module graph and Prisma client — only the entry file differs.
The web app never touches the queue or the LLM; it talks to the API over REST with a session cookie.

**The agent loop** (`src/agent/agent.service.ts` + `src/agent/tools/`) is a tool-calling loop, not
a one-shot. The LLM picks tools (`search_catalog`, `check_stock`, `match_product_by_image`,
`save_customer_detail`, `create_order`, `handoff_to_human`) until it returns a final reply or hits
`LLM_MAX_ITERATIONS`. Every run is recorded as an `AgentRun` row (model, tokens, latency, cost,
tools called) — that's the data behind the inbox Activity panel and Analytics. The loop respects
merchant takeover: if a conversation's status is `human` or `closed`, the worker bails without
calling the LLM. **To add a tool:** write a function in `agent/tools/`, register it in
`agent.service.ts`; keep each tool small and focused — the LLM does the orchestration.

**`@jobab/shared` is the contract.** Every shape that crosses the network is a Zod schema in
`packages/shared/src/`. Three consumers: the backend validates requests with `Schema.parse(body)`
in controllers; the web app imports the inferred type (`z.infer<...>`); Swagger generates
`/docs` from them via `src/swagger/zod-registry.ts`. To add/change a field, edit it once in shared
and let TypeScript point you to every call site. **Never duplicate a network shape.**

## Conventions

- **Backend = feature folders**, each `xxx.module.ts` / `xxx.controller.ts` / `xxx.service.ts`
  (+ colocated `*.spec.ts`). No `dto/`/`entities/`/`repositories/` ceremony — Zod is the DTO,
  Prisma is the entity, the service is the repository. Controller owns routing + `Schema.parse` +
  Swagger decorators and never touches the DB; service owns business logic + Prisma + other
  services and never parses HTTP. Cross-cutting folders (`common/`, `config/`, `prisma/`,
  `observability/`, `queue/`, `swagger/`) are `@Global()`.
- **Frontend route = `page.tsx → <Route>Client.tsx → use<Route>State.ts → <Section>.tsx`.**
  `page.tsx` is a dumb server data-fetch; the Client is a thin orchestrator (layout / view
  switching); the state hook holds _all_ `useState`/`useEffect`/`api.*` calls; sections are
  stateless and prop-driven. When a state hook outgrows ~300 LOC, split it into sibling hooks
  with the top-level hook as composer (see `app/inbox/`). Cleanest examples: `app/orders/`,
  `app/onboarding/`.
- **API client:** `apps/web/lib/api.ts` — one typed method per endpoint, typed against
  `@jobab/shared`. The web app's `/api/backend/*` proxies to NestJS with cookies.
- **File names:** `kebab-case.ts` backend; `PascalCase.tsx` components; `use-foo.ts` for
  cross-route hooks, `useFoo.ts` when colocated with a route.
- **File size:** aim < 200 lines, hard ceiling ~300. If a file does more than one thing, split it.
- **Config:** `src/config/` is a Zod-validated env loader — the backend refuses to boot on
  missing keys. Env templates: `apps/backend/.env.example`, `apps/web/.env.example`.
- **Commits:** Conventional Commits (commitlint enforced). Pre-commit hook runs prettier +
  eslint via lint-staged.

## Design / UI conventions (`apps/web`)

The design system is token-driven so new UI matches the app first time without
guesswork. Follow these and design requests generate correct-first, cutting the
expensive tweak-and-regenerate loop.

- **Use semantic color tokens, never raw hex or Tailwind palette colors.** Tokens
  are defined as CSS variables in `app/globals.css` and exposed as Tailwind colors
  in `tailwind.config.ts`:
  - Surfaces: `bg`, `surface`, `surface-2`, `surface-3`
  - Text: `ink` (primary), `ink-2` (secondary), `ink-3` (muted)
  - Borders: `border`, `border-2`
  - Brand: `accent`, `accent-soft`, `accent-line`, `accent-ink`, `on-accent`
  - Status tones, each with a `-bg` pair: `amber`/`amber-bg` (warning),
    `red`/`red-bg` (error/complaint), `paid`/`paid-bg` (success), `you`/`you-bg`
    (merchant/human). Example: `text-paid bg-paid-bg`.
- **Do NOT add `dark:` variants.** Theming is automatic: `.theme-light` /
  `.theme-dark` on `<body>` swaps every CSS variable. Use the semantic tokens and
  both themes work for free. Hard-coded colors break dark mode.
- **Fonts:** `font-display` (Bricolage Grotesque) for headings/display;
  `font-body` (Hind Siliguri) is the default and handles Bangla — never swap fonts
  or import new ones. `font-mono` for code/numbers.
- **Class composition:** use `cn()` from `lib/cn` (clsx + tailwind-merge) for any
  conditional or merged className. Don't hand-concatenate class strings.
- **Reuse shared primitives** in `components/shared/` before building new ones:
  `Avatar`, `EmptyState`, `Skeleton`, `Toast`, `ThemeToggle`, `ConnectivityBanner`,
  `Jamdani` (brand mark). Promote a primitive here only when 3+ routes use it.
- **Component idiom:** named export, `'use client'` only when interactive, small
  and stateless (props in, callbacks up). Small status pills take a `tone` prop —
  copy `app/orders/StatusChip.tsx` as the reference pattern.
- **Tokens for shape/motion too:** radius `rounded-lg` / `rounded-pill`; shadows
  `shadow-sm` / `shadow-md` / `shadow-lg`; entrance animations `animate-jb-rise`,
  `animate-jb-slidein`, `animate-jb-pulse` (defined in the Tailwind config).
- **When restyling, match the nearest sibling component** rather than inventing a
  new look — the cheapest way to stay consistent.

**Keeping design cost down:** prefer targeted `Edit`s over full-file rewrites;
agree the look in a sentence before generating; scope to one component at a time.
Reserve the heavy `epic-design` skill for genuinely cinematic work — for ordinary
components just describe them plainly so the inspect→judge→plan pipeline is skipped.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:

- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
