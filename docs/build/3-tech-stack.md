# Tech stack — what we use and why

Every library in Jobab earns its keep. This page tells you what each one
does, why we picked it over alternatives, and where to find it in the code.

If you're new to the codebase, read this alongside the
[architecture doc](https://github.com/siraajul/jobab/blob/main/ARCHITECTURE.md)
and you'll have the mental model in one sitting.

::: tip How to read this page
Each section groups libraries by where they live (backend, web, mobile…).
Tables show **what it does → why we chose it → where in the code**.
File paths are clickable on GitHub.
:::

---

## The languages and the workspace

| Tech                | Why                                                                                                                                            | Where                                                                                     |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **TypeScript**      | One language across backend, frontend, mobile, shared types. Catches bugs at compile time. Refactoring is safe.                                | Everywhere                                                                                |
| **pnpm workspaces** | Multi-package monorepo with strict isolation (no accidental dep leakage between apps). Fast installs via content-addressable store.            | [`pnpm-workspace.yaml`](https://github.com/siraajul/jobab/blob/main/pnpm-workspace.yaml)  |
| **Zod**             | One schema definition that gives you a runtime validator AND a TypeScript type. Powers `@jobab/shared` — the contract between backend and web. | [`packages/shared/src/`](https://github.com/siraajul/jobab/tree/main/packages/shared/src) |

Why one language instead of, say, Python on the backend? The agent loop
shape (tool calls, validation, retries) is identical to the frontend's API
shape. Sharing types in one language eliminates the schema-drift bugs that
crop up when backend and frontend types live in different worlds.

---

## Backend (`apps/backend`)

The whole AI loop, the API, the worker, the database. Built to run two
processes side by side (HTTP server + queue worker).

### Framework + runtime

| Tech                                         | Why                                                                                                                                                                                | Where                                                                                                          |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **NestJS 10**                                | Opinionated structure (modules, controllers, services, guards). Decorator-based DI keeps wiring obvious. Easy to onboard junior devs because every feature follows the same shape. | [`apps/backend/src/`](https://github.com/siraajul/jobab/tree/main/apps/backend/src) — every folder is a module |
| **Express** (via `@nestjs/platform-express`) | The default Nest HTTP adapter. Mature, well-understood, every body parser / middleware works.                                                                                      | Implicit in `main.ts`                                                                                          |
| **TSX / ts-node-dev**                        | Fast TypeScript dev server with hot reload.                                                                                                                                        | `package.json` scripts                                                                                         |

**Why NestJS over Fastify-only or a thinner stack?** The repo has 25+ feature
modules (`agent`, `messenger`, `webhooks`, `conversations`, etc.). Without
Nest's module system, the wiring becomes spaghetti by week 3. The dev-experience
cost of decorators is worth the long-term structure.

### Database + ORM

| Tech              | Why                                                                                                                                                                             | Where                                                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **PostgreSQL 16** | Battle-tested relational store. Supports JSON columns for message attachments and the `pgvector` extension for AI similarity search.                                            | `docker-compose.yml`                                                                                                                      |
| **pgvector**      | Stores AI text + image embeddings as vectors directly in Postgres. Enables nearest-neighbour search (`text_embedding <-> $1`) without a separate vector database like Pinecone. | [`prisma/schema.prisma`](https://github.com/siraajul/jobab/blob/main/apps/backend/prisma/schema.prisma) — `Unsupported("vector")` columns |
| **Prisma 5**      | Type-safe ORM. Schema-first migrations. Auto-generated client with full TS types. Migration history lives in `prisma/migrations/`.                                              | [`prisma/`](https://github.com/siraajul/jobab/tree/main/apps/backend/prisma)                                                              |

**Why Prisma over TypeORM or raw SQL?** Prisma's generated types catch
schema/code drift at compile time. The migration story is straightforward
(versioned SQL files, no magic). Trade-off: pgvector ops still need raw
queries (Prisma doesn't model `vector` columns natively yet) — see
`agent/tools/match_product_by_image.ts` for the raw vector query.

### Queue + caching

| Tech        | Why                                                                                                                    | Where                                                                              |
| ----------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **Redis**   | In-memory store for the BullMQ queue. Single dependency, runs in Docker locally.                                       | `docker-compose.yml`                                                               |
| **BullMQ**  | Production-grade Redis-backed job queue. Handles retries, delayed jobs, rate limits, and the worker concurrency model. | [`src/queue/`](https://github.com/siraajul/jobab/tree/main/apps/backend/src/queue) |
| **ioredis** | The Redis client BullMQ uses under the hood.                                                                           | Implicit                                                                           |

**Why a queue?** Meta webhooks need a 200 response in under 200ms or Meta
retries. The LLM call can take 2-5 seconds. The HTTP handler stores the
message and enqueues a job; the worker processes it. Keeps webhooks fast,
makes retries easy.

### AI / ML

| Tech                         | Why                                                                                                            | Where                                                                                      |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **Groq** (Llama 3.3 70B)     | Tool-calling LLM, very fast (sub-second token streaming), cheap. Used for the main agent loop.                 | [`src/agent/llm/`](https://github.com/siraajul/jobab/tree/main/apps/backend/src/agent/llm) |
| **Groq** (Llama 4 Scout 17B) | Multimodal vision model. Describes customer-sent product photos so we can search the catalog.                  | `src/vision/`                                                                              |
| **OpenAI SDK**               | Used as a generic OpenAI-compatible client to talk to Groq (Groq's API is OpenAI-compatible).                  | `src/agent/llm/groq.provider.ts`                                                           |
| **Jina embeddings v3**       | Bengali-capable text embeddings (most embedding models are English-only). 1024-dim vectors stored in pgvector. | `src/embeddings/`                                                                          |
| **Stub provider**            | Deterministic in-memory LLM that returns scripted replies — used in tests so we don't pay for tokens.          | `src/agent/llm/stub.provider.ts`                                                           |

**Why Groq, not OpenAI or Anthropic directly?** Latency. Bangladeshi merchants
expect Messenger-fast replies. Groq's tokens-per-second on Llama 3.3 70B
beats every other provider by 5-10x. Cost is also ~10x cheaper. The
trade-off (Llama isn't quite GPT-4 quality) is acceptable because the agent
loop is tightly tool-driven and rarely needs deep reasoning.

**Why our own provider abstraction?** Because we'll inevitably want to test
Gemini or swap providers if pricing/quality shifts. The `LlmProvider`
interface in `src/agent/llm/llm.token.ts` makes swapping a 1-file change.

### Auth + crypto

| Tech                          | Why                                                                              | Where                                                                                                      |
| ----------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **bcryptjs**                  | Password hashing for dev auth. Pure JS, no native build issues across platforms. | `src/auth/`                                                                                                |
| **cookie-parser**             | Parses the session cookie (and the Jobab `jobab_org` active-org cookie).         | `main.ts`                                                                                                  |
| **node:crypto** (AES-256-GCM) | Encrypts Page Access Tokens at rest in the database with `ENCRYPTION_KEY`.       | [`src/common/encryption/`](https://github.com/siraajul/jobab/tree/main/apps/backend/src/common/encryption) |

**Why our own auth and not Clerk/Supabase yet?** Dev velocity. Real prod auth
is on the [status](../status.md) page as a pre-launch blocker; we'll swap
in Clerk or Supabase before public sign-up.

### Validation + safety

| Tech                    | Why                                                                                                                   | Where                         |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| **Zod**                 | Runtime validation for every API body and webhook payload. Schemas in `@jobab/shared` are the single source of truth. | All controllers parse via Zod |
| **Helmet**              | Sane HTTP security headers (XSS, clickjacking, MIME-sniff defaults).                                                  | `main.ts`                     |
| **`@nestjs/throttler`** | Per-IP rate limiting on the API.                                                                                      | `app.module.ts`               |

### Observability

| Tech                         | Why                                                                                                                         | Where                                                                                              |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **Pino** (via `nestjs-pino`) | Structured JSON logs. Fast (one of the fastest Node loggers). `pino-pretty` makes them readable in dev.                     | All `Logger` calls                                                                                 |
| **Sentry**                   | Backend error tracking + performance. Optional — falls back to no-op when `SENTRY_DSN` is unset.                            | [`src/observability/`](https://github.com/siraajul/jobab/tree/main/apps/backend/src/observability) |
| **Langfuse**                 | LLM-specific tracing — every agent run shows tools called, tokens consumed, latency, cost. Powers the in-app activity feed. | `src/observability/`                                                                               |

**Why both Sentry and Langfuse?** Sentry handles "code threw an error" (HTTP
500s, DB failures). Langfuse handles "the AI did a weird thing" (wrong tool
called, cost spike, hallucination). Different debugging needs, different tools.

### API documentation

| Tech                                 | Why                                                                          | Where                                                                                                                 |
| ------------------------------------ | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **`@nestjs/swagger`**                | Generates OpenAPI spec from controller decorators. Lives at `/docs` in dev.  | All controllers                                                                                                       |
| **`@asteasolutions/zod-to-openapi`** | Bridges Zod schemas → OpenAPI components. Avoids hand-writing schemas twice. | [`src/swagger/zod-registry.ts`](https://github.com/siraajul/jobab/blob/main/apps/backend/src/swagger/zod-registry.ts) |
| **swagger-ui-express**               | Renders the interactive API explorer.                                        | `main.ts`                                                                                                             |

### Testing

| Tech          | Why                                                  | Where              |
| ------------- | ---------------------------------------------------- | ------------------ |
| **Jest**      | Standard Node test runner. NestJS scaffolds with it. | `src/**/*.spec.ts` |
| **ts-jest**   | Type-checks tests as they run.                       | Jest config        |
| **Supertest** | HTTP integration tests against the live Express app. | Integration tests  |

---

## Web dashboard (`apps/web`)

The merchant-facing inbox. Optimised for "watch live, take over when needed."

| Tech                        | Why                                                                                                                                                                                    | Where                                                                                           |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Next.js 14** (App Router) | Server-side rendering for fast first paint, React Server Components for chunky data fetches, file-based routing. Same proxy lets us call the backend same-origin so cookies just work. | [`app/`](https://github.com/siraajul/jobab/tree/main/apps/web/app)                              |
| **React 18.3**              | The view layer.                                                                                                                                                                        | Everywhere                                                                                      |
| **Tailwind CSS**            | Utility-first styling. Pairs well with React. Theme tokens in `tailwind.config.ts` map to CSS variables (light/dark mode).                                                             | [`tailwind.config.ts`](https://github.com/siraajul/jobab/blob/main/apps/web/tailwind.config.ts) |
| **clsx + tailwind-merge**   | The two-line `cn()` helper merges Tailwind classes without conflicts (e.g. `cn('px-2', condition && 'px-4')` → just `px-4`).                                                           | `lib/cn.ts`                                                                                     |

**Why Next.js, not Vite + React Router?** The inbox needs SSR for SEO-friendly
merchant landing pages and fast first paint on the dashboard. App Router's
loading/error/not-found conventions slot in cleanly. The `/api/backend/*`
rewrite pattern (Next proxies to NestJS) keeps the session cookie same-site
without CORS gymnastics.

---

## Mobile app (`apps/mobile`)

Early-stage Expo scaffold for the merchant on the go.

| Tech                   | Why                                                                                                                                     | Where                                                                     |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **Expo SDK 51**        | One toolchain for iOS + Android + web. EAS for builds & OTA updates. No native Xcode/Android Studio knowledge needed for most features. | [`apps/mobile/`](https://github.com/siraajul/jobab/tree/main/apps/mobile) |
| **expo-router**        | File-based routing for React Native — same mental model as Next.js.                                                                     | `app/`                                                                    |
| **NativeWind 4**       | Tailwind for React Native. Class names work just like the web app.                                                                      | `tailwind.config.ts`                                                      |
| **expo-notifications** | Push notifications when a customer needs the merchant.                                                                                  | `lib/push.ts`                                                             |
| **expo-secure-store**  | Securely stores the merchant's session token on device.                                                                                 | `lib/auth.ts`                                                             |

**Why Expo, not bare React Native?** Solo founder, no native dev. Expo handles
the heavy lifting (builds, signing, push provisioning). We can always eject
later if we hit a true Expo limitation.

---

## Shared types (`packages/shared`)

Where the backend and the web app agree.

| Tech    | Why                                                                                                            | Where                  |
| ------- | -------------------------------------------------------------------------------------------------------------- | ---------------------- |
| **Zod** | Defines every API contract once. Backend uses it for runtime validation; web app imports the inferred TS type. | `packages/shared/src/` |

This is what keeps backend and frontend in sync. When the API shape changes,
TypeScript breaks in both apps and tells you exactly where.

---

## Docs site (`apps/docs`)

This site you're reading.

| Tech              | Why                                                                                                                                                       | Where                                                                                       |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **VitePress 1.x** | Vue-powered static site generator. Source = the same Markdown files in `docs/` that render natively on GitHub. Sidebar, search, dark mode out of the box. | [`apps/docs/.vitepress/`](https://github.com/siraajul/jobab/tree/main/apps/docs/.vitepress) |
| **Vue 3**         | VitePress' framework — we don't write Vue ourselves.                                                                                                      | Peer dep                                                                                    |

---

## External services

Things we pay for or depend on outside our infra.

| Service                  | What it does                                                                               | Status                                              |
| ------------------------ | ------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| **Meta Graph API** (v22) | Receive customer DMs, send AI replies for Facebook + Instagram pages.                      | Real, gated by `MESSENGER_DRY_RUN`                  |
| **WhatsApp Cloud API**   | Same idea for WhatsApp. Per-message billing.                                               | Phase 2 — not yet built                             |
| **Groq Cloud**           | Hosts the Llama 3.3 + Llama 4 Scout models.                                                | Real, requires `LLM_API_KEY`                        |
| **Jina AI**              | Text + image embeddings (Bengali-capable).                                                 | Real, optional — falls back to describe-then-search |
| **bKash**                | Payment gateway. Dev fallback returns a placeholder link; prod needs merchant credentials. | Real code path, sandbox-mode                        |
| **Sentry**               | Error tracking (backend + web + mobile).                                                   | Optional                                            |
| **Langfuse Cloud**       | LLM observability dashboard.                                                               | Optional                                            |

---

## Tooling (`/`)

Dev-time conventions enforced for everyone.

| Tool                               | Why                                                                                                     | Where                             |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------- |
| **ESLint**                         | Catches obvious bugs (unused vars, missing await, etc). Each app has its own flat config.               | `apps/*/eslint.config.*`          |
| **Prettier**                       | One opinion on formatting. Runs on every commit via lint-staged.                                        | `.prettierrc` (implicit)          |
| **commitlint**                     | Enforces conventional-commit format (`feat: …`, `fix: …`). Powers automatic changelog generation later. | `package.json` `commitlint`       |
| **simple-git-hooks + lint-staged** | Auto-format and lint files on commit. No "I forgot to run the formatter" debate in PR reviews.          | `package.json` `simple-git-hooks` |
| **Docker Compose**                 | One command (`pnpm infra:up`) brings up Postgres + Redis. No "works on my machine."                     | `docker-compose.yml`              |

---

## What we considered and didn't pick

These came up in design discussions; here's why they didn't make the cut.

| Considered                      | Why we didn't pick it                                                                                                                                            |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pinecone / Weaviate (vector DB) | pgvector inside Postgres is faster to operate (one DB, one backup, one auth) and plenty fast at our scale.                                                       |
| OpenAI GPT-4                    | 5-10x slower than Groq Llama 3.3 for tool-calling, ~10x more expensive. Quality difference doesn't justify it for our use case.                                  |
| Twilio / Gupshup for WhatsApp   | Meta now offers WhatsApp Cloud API directly. Cuts a middleman + price markup. (Older `WA_*` env vars exist for legacy Twilio path — not used for the main flow.) |
| Clerk / Supabase auth           | Will switch before production, but dev cookies were faster to ship for pilot. Tracked in [status](../status.md).                                                 |
| Docusaurus / GitBook for docs   | VitePress was lighter, faster to build, plays nicer with our pnpm monorepo.                                                                                      |
| Bare React Native               | Expo solves 95% of mobile needs without native Xcode/Android knowledge.                                                                                          |
| Yarn / npm workspaces           | pnpm's strict isolation prevents accidental deps and its content store makes installs much faster on a monorepo this size.                                       |

---

## How to add a new dependency

1. Run `pnpm add <pkg> --filter @jobab/<app>` (or `-D` for dev).
2. Update this page with: **what it does → why you picked it → where in the code**.
3. If it goes in `pnpm-workspace.yaml`'s `allowBuilds`, justify it in the PR — only trust packages whose install-time scripts you've actually read.

::: tip Keep this list honest
If we drop a library, drop it from this page. If we add one and don't update
this page, the next person to read it inherits a wrong mental model. Delete
ruthlessly.
:::

---

## Next

- See how it all fits together: [Architecture](https://github.com/siraajul/jobab/blob/main/ARCHITECTURE.md)
- Why the codebase looks the way it does: [Architecture decisions](./decisions/)
- Get the project running locally: [Local setup](./1-setup.md)
