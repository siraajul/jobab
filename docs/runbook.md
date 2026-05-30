# Runbook — running Jobab locally

Everything a developer needs to get the project running on their machine and
keep it running. The [README](../README.md) covers the 60-second quickstart;
this is the full reference.

## Table of contents

- [Prerequisites](#prerequisites)
- [First-time setup](#first-time-setup)
- [Resuming a previous setup](#resuming-a-previous-setup)
- [How many terminals do I need?](#how-many-terminals-do-i-need)
- [Environment variables](#environment-variables)
- [Useful scripts](#useful-scripts)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- **Node 20+**
- **pnpm 9+** (`corepack enable && corepack prepare pnpm@9 --activate`)
- **Docker** (for Postgres + Redis)

## First-time setup

```bash
# 1. Infra — Postgres (pgvector) + Redis
docker compose up -d                                 # or: pnpm infra:up

# 2. Install, build shared types, generate the Prisma client
pnpm install
pnpm --filter @jobab/shared build
pnpm --filter @jobab/backend prisma:generate

# 3. Env files
cp apps/backend/.env.example apps/backend/.env
cp apps/web/.env.example     apps/web/.env.local
# edit apps/backend/.env  → set LLM_API_KEY, ENCRYPTION_KEY (optionally JINA_API_KEY)
# edit apps/web/.env.local → set DEV_PASSWORD

# 4. Migrate + seed
pnpm --filter @jobab/backend prisma:deploy           # apply migrations
pnpm --filter @jobab/backend seed                    # seed "Rongdhonu Boutique"

# 5. Dev — three processes (one terminal each)
pnpm --filter @jobab/backend start:dev               # API on :3000, Swagger at /docs
pnpm --filter @jobab/backend start:worker:dev        # agent worker
pnpm --filter @jobab/web dev                          # dashboard on :3001

# 6. Try the loop end-to-end
DEFAULT_PAGE_ID=page_rongdhonu pnpm --filter @jobab/backend send -- \
  --customer fb_tahmina "lal jamdani shari ache? medium lagbe"
```

Open the dashboard at <http://localhost:3001> and the Swagger UI at
<http://localhost:3000/docs>.

## Resuming a previous setup

Once `pnpm install`, migrations, and `.env` files are done, starting the stack
is just infra + the three dev processes:

```bash
pnpm infra:up                                          # Postgres + Redis
pnpm --filter @jobab/backend start:dev                 # API :3000
pnpm --filter @jobab/backend start:worker:dev          # agent worker
pnpm --filter @jobab/web dev                            # dashboard :3001
```

`pnpm dev` from the root starts API + web in parallel but **skips the worker** —
start it separately if you want the AI agent to actually reply.

Re-run these only if the relevant thing changed since last time:

| Change                              | Re-run                                                              |
| ----------------------------------- | ------------------------------------------------------------------- |
| `package.json` / lockfile           | `pnpm install`                                                      |
| Anything in `packages/shared`       | `pnpm --filter @jobab/shared build`                                 |
| `apps/backend/prisma/schema.prisma` | `pnpm --filter @jobab/backend prisma:generate` then `prisma:deploy` |
| Want a fresh DB                     | `pnpm --filter @jobab/backend prisma:reset` then `seed`             |

## How many terminals do I need?

Full local dev: **4 terminals** (3 long-running processes + 1 spare). Infra
(Postgres + Redis) runs detached via `pnpm infra:up`, so it doesn't need one.

| #   | Terminal      | Command                                         | Why                                                                                            |
| --- | ------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 1   | Backend API   | `pnpm --filter @jobab/backend start:dev`        | NestJS API on `:3000`                                                                          |
| 2   | Agent worker  | `pnpm --filter @jobab/backend start:worker:dev` | BullMQ consumer — runs the AI loop. Without this, customer DMs queue up but never get a reply. |
| 3   | Web dashboard | `pnpm --filter @jobab/web dev`                  | Next.js on `:3001`                                                                             |
| 4   | Spare         | —                                               | For `pnpm infra:up`, fake DMs, prisma commands, git, etc.                                      |

Shortcuts:

- **3 terminals** — skip the spare, briefly stop a dev process when you need a one-off command.
- **2 terminals** — only care about the dashboard UI, not AI replies: `pnpm dev` from root (API + web together) in #1, spare in #2. Skips the worker.
- **1 terminal** isn't viable — both `start:dev` and the worker hold the foreground.

## Environment variables

`apps/backend/.env` (Zod-validated at boot — the app refuses to start on missing
or malformed keys):

| Variable                                                       | Purpose                                                   |
| -------------------------------------------------------------- | --------------------------------------------------------- |
| `DATABASE_URL`                                                 | Postgres connection string (pgvector enabled)             |
| `REDIS_URL`                                                    | Redis connection for BullMQ                               |
| `LLM_API_KEY`                                                  | Groq API key (**required**)                               |
| `LLM_PROVIDER` / `LLM_MODEL` / `VISION_MODEL`                  | Model selection                                           |
| `LLM_MAX_ITERATIONS` / `LLM_MAX_OUTPUT_TOKENS`                 | Agent loop limits                                         |
| `JINA_API_KEY`                                                 | Embeddings (optional; falls back to describe-then-search) |
| `ENCRYPTION_KEY`                                               | Encrypts stored catalog credentials (**required**)        |
| `META_APP_SECRET` / `META_VERIFY_TOKEN` / `META_GRAPH_VERSION` | Meta webhook + Send API                                   |
| `MESSENGER_DRY_RUN`                                            | When set, logs outbound messages instead of calling Graph |
| `WA_PROVIDER` / `WA_ACCOUNT_SID` / `WA_AUTH_TOKEN` / `WA_FROM` | WhatsApp merchant alerts                                  |
| `BKASH_*`                                                      | bKash payment credentials (dev fallback without them)     |
| `WEB_ORIGIN` / `PUBLIC_URL`                                    | CORS + absolute URLs                                      |
| `SENTRY_DSN` / `LANGFUSE_*`                                    | Optional observability                                    |
| `PORT` / `NODE_ENV`                                            | Server basics                                             |

`apps/web/.env.local`: `DEV_PASSWORD` (stub auth) and the backend proxy target.

## Useful scripts

| Command                                                        | What                                            |
| -------------------------------------------------------------- | ----------------------------------------------- |
| `pnpm dev`                                                     | All apps in parallel (no worker)                |
| `pnpm typecheck`                                               | TypeScript check across every package           |
| `pnpm test`                                                    | Unit tests (Jest) for every package             |
| `pnpm lint` / `pnpm format`                                    | ESLint + Prettier                               |
| `pnpm infra:up` / `pnpm infra:down`                            | Just the Postgres + Redis containers            |
| `pnpm db:migrate`                                              | Prisma `migrate dev`                            |
| `pnpm db:seed`                                                 | Seed Rongdhonu Boutique                         |
| `pnpm --filter @jobab/backend send -- --customer <id> "<msg>"` | Inject a fake customer DM through the full loop |

## Testing

```bash
pnpm test                                   # all packages
pnpm --filter @jobab/backend test           # backend (agent tools, order guardrail, …)
pnpm --filter @jobab/backend typecheck
pnpm --filter @jobab/web typecheck
```

The agent tools, order guardrail, and grounding checks have unit coverage; the
shared schemas give both apps runtime validation for free.

## Troubleshooting

| Symptom                                                | Likely cause                                                            | Fix                                                                                              |
| ------------------------------------------------------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `start:dev` exits with "Cannot connect to DB"          | Postgres container isn't up                                             | `pnpm infra:up`, then re-run                                                                     |
| Login works but inbox is empty                         | Worker isn't running, or you haven't sent a fake DM                     | Start `start:worker:dev` and `pnpm --filter @jobab/backend send …`                               |
| Webhook returns 403 in dev                             | `META_APP_SECRET` set but signature doesn't match (request body parsed) | Use `/webhooks/meta/fake` for dev — it skips signature verification                              |
| `eslint --fix` fails in lint-staged                    | New file lives in a package without a lockfile-installed eslint         | Run `pnpm install` so the root `eslint` resolves                                                 |
| `next dev` returns 500 on every route after a few days | Stale dev server                                                        | Kill and restart `pnpm --filter @jobab/web dev` — `next dev` doesn't gracefully reload .env etc. |
