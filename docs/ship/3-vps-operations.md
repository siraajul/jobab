# Jobab VPS release and acceptance

This setup targets one Docker Compose VPS. It separates web, API, worker, Postgres/pgvector and persistent Redis. Only Caddy publishes ports. A successful local test is not a public launch, real payment receipt, Meta approval, or evidence of Bangla response quality.

## Prepare the host

Use Node 22 for local builds and pnpm 10.34.9 (pinned in `package.json`). On the VPS install a supported Docker Engine with Compose v2.24+ and configure the firewall to allow your existing SSH access and ports 80/443. Do not publish Postgres, Redis, API, or worker ports.

1. Place the checkout at `/opt/jobab` or adjust the systemd unit paths.
2. Point the app and API domain DNS records at the VPS. Remove stale IPv6 records if the VPS does not serve IPv6.
3. Copy `ops/production.env.example` to `ops/production.env`; set mode `600`. Replace placeholders, including the URL-safe database password in both database settings. Keep this file and encryption keys outside version control.
4. Configure the real Meta app, page permissions, webhook URL and verification token. Subscribe the API URL `/webhooks/meta`. Complete business verification/app review before serving merchants who are not app testers.
5. Verify the sending domain in Resend, set `EMAIL_MODE=resend`, `EMAIL_FROM` and `RESEND_API_KEY`. Never use `outbox` in production. Reset links expire after 30 minutes; consuming one revokes existing sessions. Sign out all devices is available in the avatar menu.
6. Configure Sentry and/or `ALERT_WEBHOOK_URL`, and an external monitor for app `/login` and API `/readyz`. Test alert delivery using a disposable job. Compose health status alone does not notify an operator.
7. Start with `PAYMENT_MODE=cod`. Enable bKash only after the live-provider tests below pass and all live credentials are provisioned with `BKASH_SANDBOX=false`.
8. Set `WOO_ALLOWED_HOSTS` only for operator-approved WooCommerce stores. Redirects are rejected to keep credentials from arbitrary destinations. Shopify accepts only the store's `*.myshopify.com` hostname.

The worker/API have outbound internet access for providers; Postgres and Redis are on an internal network. Runtime containers run without root, use a read-only filesystem and bounded logs, and restart automatically. Redis uses AOF persistence and `noeviction` so queued jobs/budgets are not silently discarded.

## Release and rollback

From the exact reviewed revision, run:

```bash
bash scripts/ops/release.sh <immutable-revision-tag>
bash scripts/ops/smoke.sh https://your-app-domain https://your-api-domain
```

The release builds versioned images, starts infrastructure, creates a backup, drains the old worker, applies `prisma migrate deploy`, then waits for container health. Public smoke verifies HTTP/TLS reachability, database/Redis readiness and rejection of forged deletion requests. Inspect the exact image IDs and `docker compose ps` before accepting the release. A failed release requires inspection; never run `prisma migrate reset` on a merchant database.

```bash
bash scripts/ops/rollback.sh <previous-existing-image-tag>
```

Rollback changes application images, keeping the additive schema. Do not roll back below the session-revocation security release once password resets or session revocation have been used: older code does not enforce the version counter. Preserve a deployment checkpoint before introducing those features. Reverse migrations which drop reset/delivery/payment records are deliberately not automated.

The three readiness migrations are additive. Existing users start at session version zero, old records remain readable, legacy vectors remain stored, and only vectors tagged with the matching model enter the new search path. Drain workers and use a maintenance window when changing the authentication version. For a large existing catalog, plan HNSW index creation in a maintenance window rather than assuming it is instantaneous.

## Backups and restoration

```bash
bash scripts/ops/backup.sh
bash scripts/ops/restore-drill.sh /absolute/path/to/backup.dump
```

Backups are custom-format PostgreSQL dumps, restricted by `umask 077`, checked with `pg_restore --list`, and accompanied by a checksum. The restore drill restores into a new disposable database, verifies migrations/orders are readable, and removes only that disposable database; it does not overwrite the active database.

Install the supplied `jobab-backup.service` and `.timer` after adjusting paths, then enable the timer. A local dump on the same VPS is not disaster recovery: encrypt backups, copy them to independent storage, monitor the timer/copy result, and perform a restore drill regularly. Choose retention and recovery-time/recovery-point targets with the merchant before launch. A full replacement of the active database requires a separately approved outage/recovery procedure.

Back up the encryption key separately. Losing it prevents decryption of connected page/store credentials. Rotating it also invalidates sessions and invite tokens; reconnect/re-encrypt stored credentials before removing the old key. Do not casually replace it during deployment.

## Failed jobs and delivery reconciliation

Read-only queue inspection or a selected retry, from an environment with the release's Redis settings:

```bash
pnpm --filter @jobab/backend exec tsx scripts/queue-admin.ts status
pnpm --filter @jobab/backend exec tsx scripts/queue-admin.ts failed
pnpm --filter @jobab/backend exec tsx scripts/queue-admin.ts retry <job-id>
```

API readiness checks Postgres and Redis. Worker health requires a recent heartbeat and Redis connectivity. Exhausted/nonretryable jobs generate sanitized logs/Sentry events and optionally an alert webhook. Monitor failed/delayed job counts, worker health, provider error rates and merchant token-budget exhaustion. The daily per-merchant allowance conservatively reserves text tokens; it is not a guarantee of total provider spending including image services. Also configure hard spending limits in provider accounts.

Delivery states appear in the inbox. A `dry_run` message is preview-only; `failed` was rejected; `sending`/`unknown` may have been accepted by the provider. Never automatically replay an ambiguous send: first verify the original channel/provider receipt, then reconcile that specific message. Pending/failed messages can be retried; sent messages keyed to an inbound event are deduplicated. No provider can guarantee recall of an HTTP request it already accepted. Takeover waits for a send already holding the conversation lock; after acknowledgement an older AI generation cannot start another send.

A page token rejection marks the page disconnected. Reconnect the affected page through onboarding and retest delivery; never treat a logged send attempt as delivered. WhatsApp text messages are supported; unsupported WhatsApp media is handed to a merchant instead of guessed. Real channel/permission acceptance remains mandatory.

## Semantic and visual catalog retrieval

Postgres contains the pgvector extension. Text retrieval uses `jina-embeddings-v3` with `retrieval.passage` for catalog documents and `retrieval.query` for customer queries. Images use `jina-clip-v2`; image/text models have separate spaces even though both produce 1024 dimensions. Model tags prevent mixing incompatible vectors. HNSW indexes and merchant-scoped cosine queries support semantic retrieval; reciprocal-rank fusion preserves keyword/SKU matches. Invalid vectors are rejected, and missing credentials/provider failures fall back to keyword search.

After setting `JINA_API_KEY`, log in as the merchant owner/admin and POST `/catalog/embeddings/reindex` with `{"limit":10}`. Repeat with the returned `nextCursor` until it is null. Check `indexed` against `scanned`: failed embedding requests do not count as indexed and must be retried. The endpoint is merchant-scoped and invokes the provider, so plan its cost/time before running a large backfill. Catalog imports also populate embeddings when the key is available.

The local verification catalog originally had four products and zero embeddings. Synthetic-vector integration tests prove retrieval, dimensions and merchant isolation; they do not prove Jina connectivity or semantic relevance for real Bangla queries. A real key/backfill and retrieval-quality evaluation are still needed.

## Working free-tier chat model (verified 2026-10-26)

Use `LLM_PROVIDER=groq` and `LLM_MODEL=openai/gpt-oss-120b` with a Groq API key. The previous Llama 3.3 model returned HTTP 404 for the local account; it is no longer the default. Both local and VPS environment examples now select GPT-OSS 120B.

Live API probes succeeded for `openai/gpt-oss-120b`, `openai/gpt-oss-20b`, and `qwen/qwen3.8-27b`, including a Bangla question that produced a structured catalog tool call. GPT-OSS 120B then passed the local inbound webhook → queue → real catalog lookup → persisted Bangla reply flow: Lal Jamdani Shari, BDT 1,650, Medium/Red in stock, 1,447 ms. Delivery was `dry_run`; this does not prove live Meta delivery or broad merchant quality.

Groq lists these models on its [free tier](https://console.groq.com/docs/rate-limits): 30 requests/minute, 1,000 requests/day, 8,000 tokens/minute, and 200,000 tokens/day, subject to account-specific limits. The live response headers confirmed 1,000 requests/day and 8,000 tokens/minute for this account. Tool-driven conversations use multiple model requests, so these are not conversation quotas. The [production-model list](https://console.groq.com/docs/models) includes both GPT-OSS sizes; Qwen is a preview alternative. Free-tier availability is not unlimited service, and the app's cost trace estimates paid list prices rather than confirming an invoice or billing tier.

## Quality gates

```bash
pnpm install --frozen-lockfile
pnpm --filter @jobab/shared build
pnpm --filter @jobab/backend prisma:generate
pnpm typecheck
pnpm lint
pnpm security:audit
# Set these to a disposable database ending in _test and an isolated Redis DB.
JOBAB_TEST_DATABASE_URL=postgresql://.../jobab_test pnpm --filter @jobab/backend test --runInBand --watchman=false
JOBAB_TEST_DATABASE_URL=postgresql://.../jobab_test pnpm verify:readiness
pnpm build
```

The browser gate creates/deletes its own fixtures and starts a test API, worker and dashboard on ports 3100/3101, using Redis DB 14 and an outbox instead of live email. It covers duplicate signed webhook → queued AI reply, login/takeover/human reply/logout, persisted order payment status, and one-time password recovery/session revocation. It fails when test database configuration is absent rather than silently skipping. The production dependency audit covers shipped backend/web dependencies; mobile remains an inactive scaffold with separate outstanding dependency work and is not included in the VPS images.

For live AI evaluation, use a disposable database, `MESSENGER_DRY_RUN=true`, an actual provider key and a spending limit. Run the existing multilingual, product-price, order, complaint and edge-case eval cases. The evaluator fails on execution errors and requires a 95% default check score (`EVAL_MIN_SCORE`). Review the responses with a Bangla-speaking merchant: keyword-based checks cannot certify tone, factual grounding or prompt-injection resistance. Do not claim production-grade Bangla quality from stub-provider tests.

## External acceptance still required

Before public sign-up, record evidence of:

- Real VPS host/domain, HTTPS, firewall, exact deployed revision, healthy worker/API/web, and rollback smoke.
- Verified sender domain and receipt of password-reset mail in a real mailbox.
- Approved Meta permissions and real incoming/outgoing Facebook/Instagram/WhatsApp messages, token-expiry/reconnection and failure recovery.
- Live bKash execution/query/reconciliation with a matching receipt, wrong/duplicate callback tests, and an agreed refund/support procedure; otherwise keep COD enabled.
- An independent encrypted backup copy and a restoration drill meeting the chosen recovery targets.
- Configured provider limits, functioning operator alerts, real Jina embeddings, and merchant-reviewed multilingual evaluation results.
- Published privacy/terms/deletion information with real operator/contact details and legal review. Draft policies and pilot agreements in `docs/legal` and `docs/ship/pilot` are templates, not verified legal approval or proof of publication.
- A supervised merchant pilot measuring incorrect orders, reply quality, takeover success, latency and actual provider cost. Pricing, billing/refunds and pilot consent must be agreed before charging merchants.

The signed Meta deletion callback now anonymizes customer data while retaining anonymized accounting orders, and returns a persistent random receipt at `/webhooks/meta/data-deletion-status?code=...`. It is not a replacement for a verified account-deletion/support process and a documented backup retention policy.
