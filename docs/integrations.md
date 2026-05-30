# Channel integrations — Messenger, Instagram, WhatsApp

How Jobab connects to the three platforms merchants actually sell on, in what
order we ship them, and what each one costs us in time, money, and paperwork.

This is the **plan** doc — the operational checklists live in
[`docs/meta-review/`](./meta-review/) (App Review submission kit) and the
runbook lives in [`docs/runbook.md`](./runbook.md).

---

## Why three channels (and why this order)

Bangladeshi social-commerce merchants don't pick a channel — their customers
do. A single shop typically gets DMs across:

- **Facebook Messenger** — 70–80% of volume for most BD merchants today
- **Instagram Direct** — younger / urban customers, growing fast
- **WhatsApp** — repeat customers, order updates, payment confirmations

We ship in the order **Messenger + Instagram → WhatsApp**. Messenger is the
biggest acquisition channel and Instagram piggybacks on the same OAuth flow,
so they ship as one Phase 1. **WhatsApp is now Phase 2** (was Phase 3) because
Meta deprecated Messenger's out-of-window message tags on Feb 9, 2026 — so
order-update notifications for Bangladeshi merchants ("shipped", "delivered",
"payment received") can no longer be sent through Messenger. WhatsApp
templates are the only allowed path. That promotes WhatsApp from "nice to
have" to "required for any merchant who ships physical goods."

```
Phase 1 (now)                       Phase 2 (week 6-12)
Messenger + Instagram               WhatsApp Cloud API
   │                                    │
   └──── one OAuth, one webhook ────┘    │
                                         │
                                separate webhook + templates
                                + per-message billing
```

---

## What's already real in the codebase

| Piece                                                       | Status      | File                                                    |
| ----------------------------------------------------------- | ----------- | ------------------------------------------------------- |
| Webhook signature verification (Meta `X-Hub-Signature-256`) | done        | `apps/backend/src/webhooks/`                            |
| Page/IG message normalization → `IncomingMessage`           | done        | `apps/backend/src/webhooks/`                            |
| Send API call (`graph.facebook.com/v20.0/me/messages`)      | done        | `apps/backend/src/messenger/`                           |
| `MESSENGER_DRY_RUN` env flag for dev                        | done        | `apps/backend/.env.example`                             |
| `Page.platform` enum (FACEBOOK / INSTAGRAM / WHATSAPP)      | done        | `prisma/schema.prisma`                                  |
| UI channel badges + filter                                  | done        | `apps/web/components/inbox/ChannelBadge.tsx`            |
| Facebook Login OAuth onboarding (FB + linked IG)            | done        | `apps/backend/src/onboarding/facebook-oauth.service.ts` |
| Long-lived Page Access Token exchange + encrypted storage   | done        | `apps/backend/src/onboarding/onboarding.controller.ts`  |
| Per-page webhook auto-subscription on connect               | done        | `apps/backend/src/onboarding/facebook-oauth.service.ts` |
| 24-hour-window guard on outbound sends                      | **missing** | —                                                       |
| WhatsApp Cloud API ingest                                   | **missing** | —                                                       |
| WhatsApp template registry                                  | **missing** | —                                                       |
| Embedded Signup flow for WhatsApp (merchant's own WABA)     | **missing** | —                                                       |

The Messenger code path is real; Instagram piggybacks on it; WhatsApp is the
genuinely new build.

---

## Phase 1 — Facebook Messenger

### Goal

A Bangladeshi merchant connects their Facebook Page in Jobab in under 2 minutes
and the AI starts replying to DMs the same day.

### What we build (engineering)

| Task                                                                                                 | Where                          | Effort |
| ---------------------------------------------------------------------------------------------------- | ------------------------------ | ------ |
| Facebook Login OAuth flow in `apps/web/app/onboarding`                                               | new                            | M      |
| Token exchange → long-lived Page Access Token, encrypted at rest                                     | `apps/backend/src/onboarding/` | S      |
| Subscribe page to `messages`, `messaging_postbacks`, `message_reads` webhook fields                  | `apps/backend/src/webhooks/`   | S      |
| **24-hour window guard** — block outbound sends > 24h after last inbound, unless using a message tag | `apps/backend/src/messenger/`  | S      |
| Page disconnect flow + token revocation                                                              | `apps/backend/src/onboarding/` | S      |
| Handle webhook event types we currently ignore (reactions, read receipts, message edits)             | `apps/backend/src/webhooks/`   | M      |

### What we do off the codebase (the real bottleneck)

| Task                                                                                                      | Owner         | Lead time                               |
| --------------------------------------------------------------------------------------------------------- | ------------- | --------------------------------------- |
| Create Meta Business Account + Jobab App                                                                  | founder       | 1 day                                   |
| Business Verification (trade license, NID, tax docs)                                                      | founder       | **1–3 weeks**                           |
| Privacy Policy + ToS + Data Deletion endpoint hosted publicly                                             | engineering   | 1 day (drafts already in `docs/legal/`) |
| App Review screencast (one per permission)                                                                | founder + eng | 2–3 days                                |
| Submit for `pages_messaging`, `pages_manage_metadata`, `pages_read_engagement`, `pages_manage_engagement` | founder       | submission day                          |
| **Review cycle** (expect 1–3 rounds, ~2 weeks each)                                                       | Meta          | 2–8 weeks                               |

Full submission kit: [`docs/meta-review/`](./meta-review/).

### Pre-review workaround (so we don't sit idle)

Meta's **Development Mode** allows up to 25 test users with full permissions —
no review needed. We onboard the first **3–5 pilot merchants** as test users
of our app while review runs. They get the real product; we get real data and
feedback. Pilot plan: [`docs/pilot/`](./pilot/).

### Phase 1 exit criteria

- [ ] 3 pilot merchants live on the dev-mode app
- [ ] Meta Business Verification approved
- [ ] All four permissions approved via App Review
- [ ] App switched from Development → Live
- [ ] Token-rotation cron job running
- [ ] Webhook 99.9% uptime over 7 days

---

## Phase 1b — Instagram Direct (bundled with Messenger)

### Why it's mostly free

Instagram messaging runs on the **same Graph API + webhook plumbing** as
Messenger. If a merchant's IG account is a Business Account linked to their
Facebook Page (the common case for any BD merchant who runs ads), we already
have the connection — we just need the right permissions and a slightly
different webhook subscription.

### What we build (engineering)

| Task                                                                            | Where                         | Effort |
| ------------------------------------------------------------------------------- | ----------------------------- | ------ |
| Add `instagram_basic`, `instagram_manage_messages` to OAuth scope               | `apps/web/app/onboarding`     | S      |
| Subscribe page's IG account to `messages` webhook field                         | `apps/backend/src/webhooks/`  | S      |
| Normalize IG webhook payloads (slightly different shape) into `IncomingMessage` | `apps/backend/src/webhooks/`  | S      |
| Send via `me/messages` with IG-scoped Page token                                | `apps/backend/src/messenger/` | S      |
| UI: surface IG-only quirks (no message editing, story-mention replies)          | `apps/web/components/inbox/`  | M      |

### What we do off the codebase

| Task                                                                             | Lead time                                                 |
| -------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Add IG permissions to existing App Review submission                             | bundled with Phase 1 if we plan ahead, otherwise +2 weeks |
| Pilot merchant connects IG Business Account to their FB Page (most already have) | minutes per merchant                                      |

### Phase 1b exit criteria

- [ ] IG permissions approved
- [ ] At least one pilot merchant receiving IG DMs through Jobab
- [ ] IG-channel filter + badge tested in production
- [ ] Story-mention replies handled (or explicitly out of scope)

---

## Phase 2 — WhatsApp Cloud API

WhatsApp is its own product with separate billing, separate review, separate
webhooks, and separate UX.

### What's different about WhatsApp

| Dimension                   | Messenger / IG                              | WhatsApp                                 |
| --------------------------- | ------------------------------------------- | ---------------------------------------- |
| API surface                 | Graph API, `me/messages`                    | Cloud API, `phone_number_id/messages`    |
| Per-message cost            | free                                        | **paid per template message**            |
| Outbound outside 24h window | ❌ blocked for Bangladesh (see "Why" below) | **pre-approved template**                |
| Template approval           | not required (inside window)                | **required**, ~24h per template          |
| Merchant onboarding         | OAuth, instant                              | Embedded Signup, +5 minutes              |
| Phone number                | none                                        | **dedicated number**, not in personal WA |

**Why Messenger is blocked outside 24h for BD:** Meta deprecated the
`POST_PURCHASE_UPDATE`, `CONFIRMED_EVENT_UPDATE`, and `ACCOUNT_UPDATE` message
tags **globally on Feb 9, 2026** (some sources cite April 27, 2026 as the API
enforcement date). The replacement — Messenger **Utility Messages** templates
— is only in open beta in the US, Vietnam, Thailand, and the Philippines as
of Jobab's writing. **Bangladesh is not on the list.** Until that changes,
order-update notifications (shipped, delivered, payment received) for BD
merchants must go through WhatsApp.

### Pricing reality (Bangladesh, "Rest of Asia Pacific" tier)

**Since July 1, 2025 Meta moved WhatsApp from per-conversation to per-message
billing.** Old "$0.04 per conversation" math is obsolete.

- **Service** messages (inside the 24h customer-service window, customer-initiated) — **free, unlimited**
- **Utility** templates (order updates, payment confirmations) — paid per delivered template message
- **Marketing** templates (back-in-stock, new collection) — paid per delivered template message, higher rate
- **Authentication** templates (OTP) — paid per delivered template message

Bangladesh sits in Meta's "Rest of Asia Pacific" pricing tier. **Exact USD
rates change quarterly** — check the [official pricing page](https://whatsappbusiness.com/products/platform-pricing/)
with Bangladesh selected from the dropdown before pricing your tiers.

A 20-message AI conversation that stays inside the 24h window = **$0**. A
later "your order shipped" template sent the next day = **1 paid Utility
message**. This is the unit economics to model: free chat, paid notifications.

### What we build (engineering)

| Task                                                                                                       | Where                                             | Effort |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ------ |
| WhatsApp Cloud API webhook handler (separate path from Meta Graph webhook)                                 | `apps/backend/src/webhooks/` new file             | M      |
| Normalize WA payloads → `IncomingMessage`                                                                  | `apps/backend/src/webhooks/`                      | M      |
| Send via `phone_number_id/messages`                                                                        | `apps/backend/src/messenger/` new sender          | M      |
| **Template registry** — store approved templates, render with params, fall back gracefully if not approved | new module `apps/backend/src/whatsapp-templates/` | M      |
| 24-hour window enforcement on WA (stricter than Messenger)                                                 | `apps/backend/src/messenger/`                     | S      |
| **Embedded Signup flow** for merchants to connect their WABA without leaving Jobab                         | `apps/web/app/onboarding`                         | L      |
| Per-conversation cost tracking → analytics dashboard                                                       | `apps/backend/src/analytics/`                     | M      |
| Merchant billing surface (so they see what WA cost them this month)                                        | `apps/web/app/analytics`                          | M      |

### Templates we ship at launch

Pre-draft these so we submit on day 1, since each template takes ~24h to
approve and we want them ready when merchants go live.

| Template name      | Category  | When used                                             |
| ------------------ | --------- | ----------------------------------------------------- |
| `order_confirmed`  | Utility   | AI confirms order, payment link sent                  |
| `order_shipped`    | Utility   | Merchant marks order as shipped                       |
| `order_delivered`  | Utility   | Merchant marks order as delivered                     |
| `payment_received` | Utility   | bKash payment confirmed                               |
| `payment_reminder` | Utility   | Order placed, payment not received in 6h              |
| `back_in_stock`    | Marketing | Customer asked about out-of-stock item, now available |
| `cart_abandoned`   | Marketing | AI started taking order, customer dropped off         |

7 templates × ~24h review = ~3 days if no rejections; budget a week.

### What we do off the codebase

| Task                                                            | Lead time            |
| --------------------------------------------------------------- | -------------------- |
| Create WhatsApp Business Account inside Meta Business Manager   | 1 day                |
| Provision dedicated phone number (or merchant brings their own) | minutes              |
| Submit display name for review                                  | 1–3 days             |
| Submit templates for review                                     | 1 day each, parallel |
| Per-merchant Embedded Signup walks them through their own WABA  | 5 min per merchant   |

### Phase 2 exit criteria

- [ ] At least 3 pilot merchants live on WhatsApp through Jobab
- [ ] All 7 launch templates approved
- [ ] Per-conversation cost surfaced in merchant analytics
- [ ] Billing model decided (passthrough / tiered / included)
- [ ] WA + Messenger conversations correctly stitched to same Contact (Phase 1 of the [Contact model gap](../docs/MISSING.md))

---

## Cross-channel concerns

### One Contact, many channels

Today every conversation carries its own customer data. As soon as a merchant
has the same person DM-ing them on Messenger _and_ WhatsApp, we need a real
`Contact` entity. This is the #1 open gap and gates the value of Phase 2 — see
the [Lazychat gap roadmap](../docs/MISSING.md).

### One webhook URL or three?

Recommendation: **one webhook URL per platform**, internal routing.

- `POST /webhooks/meta` — Messenger + Instagram (same payload family)
- `POST /webhooks/whatsapp` — WA Cloud API (different shape)

Reasons: easier signature verification (different secrets), easier per-channel
rate-limit handling, cleaner observability.

### Token storage

All access tokens encrypted at rest with `ENCRYPTION_KEY` (see
`apps/backend/src/common/encryption/`). Rotation:

- Page Access Tokens → long-lived, but exchange on every reconnect.
- WA System User tokens → permanent, but scoped per WABA.

### Rate limits (so we plan for them)

| Platform                              | Limit                                                           | What we do                                   |
| ------------------------------------- | --------------------------------------------------------------- | -------------------------------------------- |
| Messenger Send API                    | 250 calls/sec per app                                           | BullMQ worker rate-limits per page           |
| Instagram Send                        | **200 calls/hour per IG account** (cut from 5,000 in late 2024) | back-off + retry queue; warn merchant at 80% |
| Instagram comment/story triggered DMs | **1 DM per user per 24h** (new in 2026)                         | dedupe before enqueue                        |
| WhatsApp Cloud                        | tier-based, starts at 1k unique recipients/24h                  | request tier upgrade after 7-day stability   |

### Hard "don't do this" list (will get the app banned)

| ❌ Don't                                                         | Why                                                                                                                                                                |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Use `HUMAN_AGENT` tag for AI-generated replies                   | Meta actively detects misuse and revokes API access — fastest way to lose the integration. Tag is for **real human** agents replying within the 7-day window only. |
| Send outside-24h messages on Messenger to BD customers           | No allowed message tags exist for Bangladesh anymore; Utility Messages not available here yet.                                                                     |
| Cold-DM users who never messaged the page                        | Spam — instant policy violation regardless of channel.                                                                                                             |
| Send the same template to thousands of cold contacts on WhatsApp | Quality rating crashes → account restricted.                                                                                                                       |
| Pretend the AI is a human                                        | Meta policy violation; we already show "AI" badges in the inbox, mirror that in customer-visible signals.                                                          |

### Observability (do this once, all three channels benefit)

- Per-channel send-success rate dashboard
- Per-channel webhook latency (we should ACK in <200ms)
- Alert on signature verification failures (likely attack or key rotation)
- Alert on 24-hour-window violations (means our guard is broken)

---

## Timeline (best-case)

```
Week 1-2    Phase 1 build: OAuth, 24h guard, token rotation
Week 1      Submit Business Verification, host privacy/ToS, draft screencasts
Week 2      Submit Meta App Review (Messenger + Instagram permissions together)
Week 2-6    Pilot 3-5 merchants on dev-mode app
Week 3-8    Review cycle (expect 2 rounds)
Week 6      Phase 1b (Instagram) light surface work — same OAuth, new payloads
Week 8      Switch app to Live mode; onboard non-pilot merchants
Week 8-10   Phase 2 build: WA Cloud API webhook, templates, Embedded Signup
Week 9      Submit WA templates (parallel with build)
Week 12     First merchant on WhatsApp through Jobab
```

Realistic: add 2–4 weeks of slack for Meta review rejections.

---

## What can kill this plan

| Risk                                                | Likelihood | Mitigation                                                       |
| --------------------------------------------------- | ---------- | ---------------------------------------------------------------- |
| Business Verification rejected (legal entity issue) | medium     | start week 1, get accountant involved, have backup entity        |
| App Review rejected on `pages_messaging` repeatedly | medium     | screencast quality matters; rehearse before recording            |
| WA template rejections cascade                      | low        | start with utility templates only (high approval rate)           |
| Merchants won't migrate off WhatsApp Business app   | high       | offer second number; price WA as a paid upgrade, not the default |
| Meta API breaking change                            | low        | versioned API (`v20.0`); we lag one version behind latest        |

---

## Open questions to resolve before Phase 2 (WhatsApp)

- **WA pricing model for merchants:** passthrough, flat bundle, or tiered? Decide before we onboard merchant #5 on WhatsApp.
- **Do we host the WABA or does the merchant?** Embedded Signup says merchant hosts; this is cleaner legally but harder to onboard. Recommend: merchant hosts, Jobab assists.
- **Marketing templates from day 1?** Or utility-only until merchants ask? Recommend utility-only — lower rejection risk, simpler billing story.

---

## Related docs

- [`docs/meta-review/`](./meta-review/) — App Review submission kit (use-case copy, screencast script, test credentials)
- [`docs/legal/privacy-policy.md`](./legal/privacy-policy.md) — public privacy policy draft
- [`docs/legal/data-deletion.md`](./legal/data-deletion.md) — data deletion callback spec
- [`docs/pilot/`](./pilot/) — dev-mode pilot plan + merchant outreach
- [`docs/runbook.md`](./runbook.md) — local dev + production ops
- [`ARCHITECTURE.md`](../ARCHITECTURE.md) — the agent loop and how messages flow end-to-end
