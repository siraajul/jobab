# Jobab

**An AI sales agent for Bangladeshi social-commerce merchants — with a real-time merchant dashboard.**

[![Node](https://img.shields.io/badge/node-20+-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-9+-F69220?logo=pnpm&logoColor=white)](https://pnpm.io)
[![NestJS](https://img.shields.io/badge/NestJS-10-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com)
[![Next.js](https://img.shields.io/badge/Next.js-14-000?logo=next.js&logoColor=white)](https://nextjs.org)
[![Postgres](https://img.shields.io/badge/Postgres-16%20%2B%20pgvector-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](#license)

> _Jobab_ (জবাব) means "answer" / "reply" in Bangla.

<!-- TODO: drop a real screenshot at docs/img/inbox.png and uncomment.
<p align="center">
  <img src="docs/img/inbox.png" alt="Jobab inbox" width="900" />
</p>
-->

A merchant connects their Facebook / Instagram / WhatsApp page. Jobab's AI
replies to customer DMs in Bangla, Banglish, or English: it recognises products
from photos, searches the catalog, recommends, collects delivery details, takes
orders, generates a bKash payment link, and hands off to a human the moment a
customer reports a problem.

The merchant watches every conversation in a live inbox, steps in whenever they
want, and manages contacts, orders, and catalog from one place.

---

## What's real today

| Piece                                                                        | State                                                              |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Postgres schema, agent loop, order guardrail, BullMQ queue                   | real                                                               |
| Groq tool-calling agent (Llama 3.3) + vision (Llama 4 Scout)                 | real                                                               |
| Jina embeddings + pgvector ANN                                               | real (Jina key optional; falls back to describe-then-search)       |
| Inbox: channels, assignment, tags, complaints, notes, activity, shared files | real                                                               |
| Meta webhook ingest (signature verified)                                     | real                                                               |
| `POST /webhooks/meta` over HTTPS in prod                                     | needs ngrok / deploy + Meta App Review                             |
| Send API → `graph.facebook.com`                                              | real code; gated by `MESSENGER_DRY_RUN` in dev                     |
| Catalog: CSV / Shopify / WooCommerce                                         | real                                                               |
| bKash payment link                                                           | dev fallback; production needs merchant creds                      |
| Auth                                                                         | dev password → cookie. Replace with Clerk / Supabase per spec §11. |

---

## 60-second quickstart

Prereqs: **Node 20+**, **pnpm 9+**, **Docker**. Full setup walkthrough lives in
[`docs/runbook.md`](docs/runbook.md).

```bash
# 1. Infra (Postgres + Redis)
pnpm infra:up

# 2. Install + generate Prisma client + migrate + seed
pnpm install
pnpm --filter @jobab/shared build
pnpm --filter @jobab/backend prisma:generate
cp apps/backend/.env.example apps/backend/.env  # set LLM_API_KEY + ENCRYPTION_KEY
cp apps/web/.env.example     apps/web/.env.local
pnpm --filter @jobab/backend prisma:deploy
pnpm --filter @jobab/backend seed

# 3. Three dev processes (one terminal each)
pnpm --filter @jobab/backend start:dev          # API :3000, Swagger /docs
pnpm --filter @jobab/backend start:worker:dev   # agent worker
pnpm --filter @jobab/web dev                    # dashboard :3001

# 4. Send a fake customer DM through the full loop
DEFAULT_PAGE_ID=page_rongdhonu pnpm --filter @jobab/backend send -- \
  --customer fb_tahmina "lal jamdani shari ache? medium lagbe"
```

Open <http://localhost:3001> for the dashboard, <http://localhost:3000/docs>
for the live API.

---

## Where to go next

| You want to…                                           | Read                                                                          |
| ------------------------------------------------------ | ----------------------------------------------------------------------------- |
| **Understand how the codebase is organised**           | [`ARCHITECTURE.md`](ARCHITECTURE.md) — 10-min tour                            |
| **See the live API + try endpoints in your browser**   | <http://localhost:3000/docs> (Swagger UI)                                     |
| **Read the API guide — auth, errors, golden path**     | [`docs/api.md`](docs/api.md)                                                  |
| **Run / configure / troubleshoot the project locally** | [`docs/runbook.md`](docs/runbook.md)                                          |
| **Add a feature end-to-end (worked example)**          | [`ARCHITECTURE.md` §7 steps](ARCHITECTURE.md#adding-a-new-feature-in-7-steps) |
| **Contribute**                                         | [`CONTRIBUTING.md`](CONTRIBUTING.md)                                          |

---

## The dashboard at a glance

The merchant-facing Next.js app (`apps/web`) is a live inbox plus the tools to
run a shop.

- **Multi-channel inbox** — Facebook / Instagram / WhatsApp on one screen, with
  filters (All · Needs you · Complaints · AI · You), sort, and customer search
  (`⌘/`).
- **AI control** — see the AI reply in real time, watch it "thinking", take
  over / hand back per conversation, reuse the AI's last reply as a draft.
- **CRM right rail** — contact details, the live order assembling as the AI
  takes it, tags, internal notes, activity feed (tool calls / tokens / cost),
  shared files.
- **Operations** — Orders (with printable invoice), Catalog (CSV / Shopify /
  WooCommerce sync + per-variant stock), Comments (intent + auto-reply rules),
  Analytics (conversations / revenue / token spend / latency), Team & Settings.

---

## License

MIT — see [`LICENSE`](LICENSE) if present, or the `license` field in
`package.json`.
