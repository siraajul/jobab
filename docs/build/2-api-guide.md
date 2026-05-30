# API guide

The narrative companion to the live OpenAPI spec at
<http://localhost:3000/docs> (Swagger UI).

If you want the exact request / response shape of any single endpoint, open
the Swagger UI — it's generated from the Zod schemas in `@jobab/shared` and
never goes stale. **This document covers what Swagger can't:** the auth model,
the standard error envelope, the golden-path flow, and how to integrate Meta
webhooks.

## Table of contents

- [Your first API call in 60 seconds](#your-first-api-call-in-60-seconds)
- [How auth works](#how-auth-works)
- [The standard error envelope](#the-standard-error-envelope)
- [The golden-path flow](#the-golden-path-flow)
- [Endpoint catalog](#endpoint-catalog)
- [Receiving Meta webhooks](#receiving-meta-webhooks)

## Your first API call in 60 seconds

```bash
# 1. Seeded credentials (after `pnpm db:seed`).
EMAIL="owner@rongdhonu.dev"
PASSWORD="jobab-dev-12345"

# 2. Log in. The server sets two cookies into cookies.txt:
#      - `session`    : signed user-session token
#      - `jobab_org`  : your active org (we pick the first one for you)
curl -sS -c cookies.txt -X POST http://localhost:3000/auth/login \
  -H 'content-type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}"

# 3. Every call afterwards just needs `-b cookies.txt`.
curl -sS -b cookies.txt http://localhost:3000/auth/me

# 4. Read the inbox.
curl -sS -b cookies.txt http://localhost:3000/conversations | jq '.[0:2]'

# 5. Open the live Swagger and click around:
open http://localhost:3000/docs
```

That's the whole auth model — `cookies.txt` is your session.

## How auth works

| Concept            | Detail                                                                                                                                                                                   |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Session cookie** | `session` — HttpOnly, SameSite=Lax. Set by `POST /auth/login` (or `/sign-up`, `/accept-invite`). Browsers persist automatically; with curl use `-c cookies.txt -b cookies.txt`.          |
| **Active org**     | `jobab_org` cookie — the org you're currently working with. Set on login. Switch with `POST /auth/active-org` if you belong to several.                                                  |
| **Public routes**  | `/auth/login`, `/auth/sign-up`, `/auth/accept-invite`, `/auth/invites/inspect`, `/webhooks/*`, `/healthz`, `/readyz`. Everything else returns `401` without a valid `session` cookie.    |
| **Role gating**    | A few endpoints require `owner` / `admin` (creating invites, removing members, updating comment rules). These return `403` if your membership role is too low.                           |
| **Org isolation**  | Every protected query is scoped to the active org server-side. You cannot read or write into another tenant's data even if you guess their IDs — you'll get `404` (intentionally vague). |

## The standard error envelope

Every 4xx / 5xx response from the API uses the same shape — see the `ApiError`
schema in Swagger:

```json
{
  "statusCode": 422,
  "message": ["body.text: String must contain at most 4000 character(s)"],
  "error": "Unprocessable Entity"
}
```

| Code  | Meaning               | What you usually did wrong                                                                                 |
| ----- | --------------------- | ---------------------------------------------------------------------------------------------------------- |
| `400` | Bad request           | Malformed JSON, or a business-rule violation (e.g. "email already registered").                            |
| `401` | Unauthorised          | Missing / expired session cookie. Re-login.                                                                |
| `403` | Forbidden             | Logged in but not allowed: wrong org, wrong role, or a public-route signature mismatch (Meta webhooks).    |
| `404` | Not found             | Resource doesn't exist, or it does but isn't visible to your org.                                          |
| `422` | Unprocessable entity  | Request body failed Zod validation. `message` is a list of `path: reason` strings — show them to the user. |
| `429` | Too many requests     | You hit the rate limiter (`@nestjs/throttler`). Backoff and retry.                                         |
| `500` | Internal server error | We logged it (Sentry / pino). Safe to retry once; if it persists, open an issue with the `x-request-id`.   |

## The golden-path flow

Read inbox → take over from the AI → reply → hand back → mark an order paid.

```bash
# Take over from the AI on a specific conversation:
CONV=cm0conv123
curl -sS -b cookies.txt -X POST http://localhost:3000/conversations/$CONV/takeover

# Send a merchant reply:
curl -sS -b cookies.txt -X POST http://localhost:3000/conversations/$CONV/reply \
  -H 'content-type: application/json' \
  -d '{"text":"আপনার জন্য পেয়েছি ভাবি, একটু পরে details পাঠাচ্ছি।"}'

# Read the AI's activity for that conversation (tools, tokens, cost):
curl -sS -b cookies.txt "http://localhost:3000/conversations/$CONV/activity?limit=10" | jq

# Hand back to the AI:
curl -sS -b cookies.txt -X POST http://localhost:3000/conversations/$CONV/hand-back

# Mark an order paid manually (e.g. cash on delivery):
ORDER=cm0order123
curl -sS -b cookies.txt -X POST http://localhost:3000/orders/$ORDER/mark-paid
```

## Endpoint catalog

Every endpoint is grouped by tag in Swagger. The table below is for at-a-glance
navigation; for parameters, request / response shapes, and live examples open
the corresponding tag in `/docs`.

| Tag               | Endpoints                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **auth**          | `POST /auth/login` · `POST /auth/sign-up` · `POST /auth/logout` · `POST /auth/accept-invite` · `POST /auth/active-org` · `GET /auth/me` · `GET /auth/invites/inspect`                                                                                                                                                                                                                                                                       |
| **conversations** | `GET /conversations` · `GET /conversations/:id` · `GET /conversations/:id/messages/older?before&limit` · `GET /conversations/:id/activity?limit` · `POST /conversations/:id/takeover` · `POST /conversations/:id/hand-back` · `POST /conversations/:id/reply` · `POST /conversations/:id/assert-product` · `POST/DELETE /conversations/:id/tags[/:tagId]` · `GET/POST /conversations/:id/notes` · `DELETE /conversations/:id/notes/:noteId` |
| **tags**          | `GET /tags` · `POST /tags` · `PATCH /tags/:id` · `DELETE /tags/:id`                                                                                                                                                                                                                                                                                                                                                                         |
| **orders**        | `GET /orders?conversationId&status&payment` · `GET /orders/:id` · `PATCH /orders/:id/status` · `POST /orders/:id/mark-paid`                                                                                                                                                                                                                                                                                                                 |
| **catalog**       | `GET /catalog/products?q` · `GET /catalog/products/:id` · `POST /catalog/sync/csv` · `POST /catalog/sync/shopify` · `POST /catalog/sync/woocommerce` · `PATCH /catalog/variants/:id/stock`                                                                                                                                                                                                                                                  |
| **team**          | `GET /team/members` · `GET /team/invites` · `POST /team/invites` · `DELETE /team/invites/:id` · `DELETE /team/members/:id` · `PATCH /team/assign`                                                                                                                                                                                                                                                                                           |
| **comments**      | `GET /comments?intent&postId` · `GET /comments/rules` · `PATCH /comments/rules/:intent`                                                                                                                                                                                                                                                                                                                                                     |
| **settings**      | `GET /settings` · `PATCH /settings`                                                                                                                                                                                                                                                                                                                                                                                                         |
| **analytics**     | `GET /analytics/summary?days`                                                                                                                                                                                                                                                                                                                                                                                                               |
| **onboarding**    | `GET /onboarding/status` · `POST /onboarding/pages`                                                                                                                                                                                                                                                                                                                                                                                         |
| **push**          | `POST /push/tokens` · `DELETE /push/tokens`                                                                                                                                                                                                                                                                                                                                                                                                 |
| **webhooks**      | `GET /webhooks/meta` (verify handshake) · `POST /webhooks/meta` (signature-verified inbound) · `POST /webhooks/meta/data-deletion` (Meta App Review) · `POST /webhooks/meta/fake` (dev DM) · `POST /webhooks/meta/fake-comment` (dev comment)                                                                                                                                                                                               |
| **health**        | `GET /healthz` (liveness) · `GET /readyz` (DB + migrations check)                                                                                                                                                                                                                                                                                                                                                                           |

## Receiving Meta webhooks

Customer DMs and post comments arrive here:

```
POST /webhooks/meta
x-hub-signature-256: sha256=<HMAC-SHA256(rawBody, META_APP_SECRET)>
content-type: application/json

<Meta-shaped payload>
```

We verify the signature byte-for-byte against `META_APP_SECRET`. If it doesn't
match we return `403` without parsing the body. On match we acknowledge in
< 50 ms (Meta retries on timeout) and the heavy work is queued onto BullMQ — the
agent worker (`start:worker:dev`) drains it out-of-band.

The first time you subscribe, Meta calls
`GET /webhooks/meta?hub.mode=subscribe&hub.verify_token=<your secret>&hub.challenge=<random>`.
If `verify_token` matches `META_VERIFY_TOKEN` we echo back the challenge —
that's the entire handshake.

For local development you can skip Meta entirely:

```bash
# Inject a fake DM through the full agent loop:
curl -sS -X POST http://localhost:3000/webhooks/meta/fake \
  -H 'content-type: application/json' \
  -d '{"pageId":"page_rongdhonu","customerId":"fb_tahmina","text":"lal jamdani shari ache?"}'
```
