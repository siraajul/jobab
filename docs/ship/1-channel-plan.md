# Channel plan — Messenger, Instagram, WhatsApp

How we connect Jobab to real customer DMs, in what order, and why.

::: tip Background reading
This whole plan is shaped by Meta's messaging rules. If you haven't read
[Meta's rules in plain English](../start-here/3-meta-rules-simple.md) yet,
start there — it's a 5-minute read.
:::

## The short version

Ship in two phases:

**Phase 1 — Messenger + Instagram together.** They share the same Facebook
app and same OAuth flow, so connecting one connects both. This is the
acquisition channel — where customers first message.

**Phase 2 — WhatsApp.** Separate setup, separate billing, separate templates.
Needed for order updates after the 24-hour Messenger window closes, because
Meta deprecated the old "your order shipped" message tags in Feb 2026 and
Bangladesh isn't in the replacement beta.

```
Phase 1 (now)                       Phase 2 (week 6–12)
Messenger + Instagram               WhatsApp Cloud API
   │                                    │
   └─ one Facebook OAuth, one webhook ─┘
                                         │
                                separate webhook + paid templates
```

## Why this order

Three reasons we don't do all three at once:

**Volume.** Most BD merchants get 70–80% of their DMs on Facebook Messenger
today. Instagram is growing. WhatsApp is the long-term repeat-customer
channel. Build for the volume first.

**Plumbing reuse.** Instagram messaging runs on the exact same Facebook
Graph API as Messenger. If a merchant's Instagram is a Business Account
linked to their Facebook Page (the common case if they run ads), one OAuth
connects both. That makes Phase 1 a two-for-one.

**Cost.** Messenger is free for in-window AI replies. WhatsApp charges per
message for templates. We don't wire up paid messaging until the unpaid
path is proven.

## What's already built

You don't need to build the integration from scratch — most of it ships.

- Webhook receiver with signature verification
- Send API client with 24-hour-window guard (throws `OUT_OF_MESSAGING_WINDOW` outside the window)
- Facebook Login OAuth flow in the onboarding wizard
- Long-lived Page Access Token exchange + encrypted storage
- Automatic webhook subscription when a merchant connects a page
- `GET /conversations/:id/messaging-window` so the inbox can grey out the composer
- Page-token-rotation service (scaffold — implementation pending)

What's missing for Phase 2 (WhatsApp):

- WhatsApp Cloud API webhook receiver
- WhatsApp template registry (store approved templates, render with params)
- Embedded Signup flow so merchants connect their own WhatsApp Business Account
- Per-message cost tracking and a merchant billing surface

## Phase 1 — what you actually do

Engineering (mostly already done):

- Wire `META_APP_ID` and `META_APP_SECRET` into the backend env
- The OAuth flow already lives at `POST /onboarding/facebook/start`
- The webhook already lives at `POST /webhooks/meta`

Off-codebase (the real bottleneck — start now):

- Create a Meta Business Account and the "Jobab" app
- Submit Business Verification with trade license + NID + address proof (1–3 weeks)
- Host the privacy policy + terms of service + data deletion endpoint on a public URL
- Record screencasts for App Review (one per permission)
- Submit App Review for `pages_messaging`, `pages_manage_metadata`, `pages_read_engagement`,
  `pages_manage_engagement`, `instagram_basic`, `instagram_manage_messages`
- Wait through 1–3 review rounds (~2 weeks each)

While you wait for App Review: **Meta lets you onboard up to 25 testers
without review.** The first 3–5 pilot merchants go here. See
[pilot/README.md](./pilot/README.md).

Phase 1 is done when:

- 3 pilot merchants are using the dev-mode app
- Business Verification is approved
- All six permissions are approved via App Review
- The app is switched from Development → Live
- The token-rotation cron is running (so 60-day tokens don't expire silently)

## Phase 2 — WhatsApp

WhatsApp is its own product. Different API, different webhook, different
billing, different review path.

### What's different

| Thing              | Messenger / Instagram | WhatsApp                                           |
| ------------------ | --------------------- | -------------------------------------------------- |
| API                | Graph API             | Cloud API                                          |
| Cost in 24h window | free                  | free                                               |
| Cost outside 24h   | not allowed (BD)      | per message, template required                     |
| Template approval  | not needed in window  | needed for outside-window sends, ~24h per template |
| Onboarding         | OAuth, instant        | Embedded Signup, ~5 min per merchant               |
| Phone number       | none                  | dedicated number per WhatsApp account              |

### Pricing reality (Bangladesh)

Meta moved WhatsApp from per-conversation to per-message billing on July 1, 2025. Old "$0.04 per conversation" math is dead.

- **Service** messages (customer-initiated, in 24h window): free, unlimited
- **Utility** messages (order updates, payment confirmations): paid per delivered message
- **Marketing** messages (back-in-stock, new collection): paid per delivered message, higher rate
- **Authentication** messages (OTP): paid per delivered message

Bangladesh sits in Meta's "Rest of Asia Pacific" tier. Rates change quarterly.
Check [Meta's pricing page](https://whatsappbusiness.com/products/platform-pricing/)
with Bangladesh selected before you build your pricing model.

A 20-message AI conversation that stays inside 24h: free.
A "your order shipped" template the next day: 1 paid Utility message.

### What you build for Phase 2

- Webhook receiver at `POST /webhooks/whatsapp` (separate from `/webhooks/meta`)
- Payload normalizer (WhatsApp webhook shape is different from Facebook)
- Send method that calls `phone_number_id/messages`
- Template registry — store the templates Meta approved, render with merchant data
- Embedded Signup flow in the onboarding wizard
- Per-message cost tracking → analytics dashboard
- Merchant billing UI (so they see what WhatsApp cost them this month)

### Templates to submit early

These cover 90% of e-commerce order flows. Submit them in parallel — each
takes ~24h to approve.

| Name               | Category  | When used                                                |
| ------------------ | --------- | -------------------------------------------------------- |
| `order_confirmed`  | Utility   | AI confirmed the order, payment link sent                |
| `order_shipped`    | Utility   | Merchant marked the order as shipped                     |
| `order_delivered`  | Utility   | Merchant marked the order as delivered                   |
| `payment_received` | Utility   | bKash payment confirmed                                  |
| `payment_reminder` | Utility   | Order placed, payment not received in 6h                 |
| `back_in_stock`    | Marketing | Customer asked about an item that was out, now available |
| `cart_abandoned`   | Marketing | AI started an order, customer dropped off                |

### Phase 2 is done when

- At least 3 pilot merchants have WhatsApp connected through Jobab
- All 7 launch templates are approved
- Per-message cost shows up in the merchant analytics dashboard
- The pricing model for merchants is decided (passthrough / bundled / tiered)

## Cross-channel things to know

**One Contact, many channels.** Today every conversation carries its own
customer name and phone. As soon as a merchant has the same person DMing
them on Messenger and WhatsApp, we need a real `Contact` entity that
stitches them together. This is the #1 open gap and is tracked in
[status.md](../status.md).

**Two webhook URLs, not one.** Messenger and Instagram share `/webhooks/meta`
(same payload family). WhatsApp uses `/webhooks/whatsapp` (different shape,
different secret). Easier signature verification, cleaner observability.

**All access tokens encrypted at rest.** Page Access Tokens and WhatsApp
System User tokens are encrypted with `ENCRYPTION_KEY` using AES-256-GCM.
Source: `apps/backend/src/common/encryption/encryption.service.ts`.

**Rate limits to plan for.**

| Platform                    | Limit                                 | What we do                                     |
| --------------------------- | ------------------------------------- | ---------------------------------------------- |
| Messenger Send API          | 250 calls/sec per app                 | BullMQ worker rate-limits per page             |
| Instagram                   | 200 DMs/hour per merchant account     | back-off + retry queue, warn at 80%            |
| Instagram comment/story DMs | 1 per user per 24h                    | dedupe before enqueue                          |
| WhatsApp Cloud              | starts at 1,000 unique recipients/24h | request tier upgrade after 7 days of stability |

## Best-case timeline

```
Week 1-2    Phase 1 build: OAuth, 24h guard, token rotation (mostly done)
Week 1      Submit Business Verification; host privacy/ToS; draft App Review screencasts
Week 2      Submit App Review (Messenger + Instagram permissions together)
Week 2-6    Pilot 3-5 merchants on the dev-mode app
Week 3-8    Review cycle (expect 2 rounds)
Week 8      Switch app to Live mode; onboard non-pilot merchants
Week 8-10   Phase 2 build: WhatsApp webhook, templates, Embedded Signup
Week 9      Submit WhatsApp templates (parallel with build)
Week 12     First merchant on WhatsApp through Jobab
```

Add 2–4 weeks of slack for review rejections. Plan accordingly.

## Things that can kill this plan

| Risk                                                  | Likelihood | What to do                                                               |
| ----------------------------------------------------- | ---------- | ------------------------------------------------------------------------ |
| Business Verification rejected (legal entity issue)   | medium     | Start week 1, get an accountant, have a backup entity                    |
| App Review rejected on `pages_messaging` repeatedly   | medium     | Screencast quality matters — rehearse before recording                   |
| WhatsApp template rejections cascade                  | low        | Start with utility templates only (high approval rate)                   |
| Merchants won't migrate off the WhatsApp Business app | high       | Offer a second number; price WhatsApp as a paid upgrade, not the default |
| Meta API breaking change                              | low        | We pin a Graph version and stay one version behind latest                |

## Related docs

- [Step-by-step Meta setup](./2-meta-setup.md) — actually click through the Meta dashboard
- [App Review submission kit](./app-review/) — screencast scripts, test credentials, use-case copy
- [Pilot launch plan](./pilot/) — onboarding the first 3–5 merchants under dev mode
- [Status of the project](../status.md) — what's done, what's blocking
