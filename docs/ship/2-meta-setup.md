# Meta setup — step by step

Use this when you're connecting Jobab to a real Facebook Page, Instagram, or
WhatsApp account for the first time. By the end the AI will be replying to a
real customer DM.

Plan a full day. Some of it is waiting for Meta (Business Verification is
1–3 weeks but you can do everything else in parallel).

If you only want to understand the strategy, read the
[channel plan](./1-channel-plan.md) instead.

---

::: warning Read the rules first
This guide assumes you understand the
[Meta messaging rules](../start-here/3-meta-rules-simple.md). If any of the
bullets below surprise you, skip back and read that doc first — it's
short.
:::

## Before you start — the realities you must know

- Inside the 24-hour customer-service window: free AI replies, no review.
  This is what Jobab is for.
- Outside 24h on Messenger in Bangladesh: blocked. Old message tags were
  killed by Meta in Feb 2026; the replacement isn't available here yet.
- Outside 24h on WhatsApp: allowed via pre-approved templates only, paid per
  message.
- HUMAN_AGENT tag for AI replies: don't. Meta detects misuse and bans you.
- Instagram rate limit: 200 DMs/hour per merchant account, plus 1-per-user-per-24h
  for comment-triggered DMs.

---

## Step 0 — Accounts and URLs you'll need

Do this once for your whole company.

### Accounts

| Account                       | Where                                                      | Cost                      |
| ----------------------------- | ---------------------------------------------------------- | ------------------------- |
| Meta Business Account         | [business.facebook.com](https://business.facebook.com)     | free                      |
| Meta Developer account        | [developers.facebook.com](https://developers.facebook.com) | free                      |
| WhatsApp Business Account     | inside Business Manager                                    | free; per-message billing |
| Public HTTPS URL for webhooks | ngrok / Cloudflare Tunnel in dev, Fly/Render in prod       | free tier OK              |

### Create the Meta app

1. Go to [developers.facebook.com/apps](https://developers.facebook.com/apps) → **Create App**
2. Use case: **Other** → type: **Business**
3. Name it `Jobab`, contact email is your business email
4. Attach it to the Meta Business Account you just made

Save the **App ID** and **App Secret** somewhere safe. They'll go into the
backend env as `META_APP_ID` and `META_APP_SECRET`.

### Host three public URLs

Meta requires all three to be publicly reachable before App Review.

| Purpose                | Path                                                  | Source                                                       |
| ---------------------- | ----------------------------------------------------- | ------------------------------------------------------------ |
| Privacy Policy         | `https://your-domain/privacy`                         | [`docs/legal/privacy-policy.md`](../legal/privacy-policy.md) |
| Terms of Service       | `https://your-domain/terms`                           | derive from privacy policy                                   |
| Data Deletion callback | `https://api.your-domain/webhooks/meta/data-deletion` | [`docs/legal/data-deletion.md`](../legal/data-deletion.md)   |

In dev you can run the data-deletion endpoint through ngrok, but the privacy
and ToS URLs need a stable real domain. Set those up first.

### Backend env

Add to `apps/backend/.env`:

```ini
# Shared across Messenger and Instagram
META_APP_ID=<from Meta dashboard>
META_APP_SECRET=<from Meta dashboard>
META_VERIFY_TOKEN=<any random string you make up, used in webhook handshake>
META_GRAPH_VERSION=v22.0

# WhatsApp Cloud API (Phase 2)
WA_PROVIDER=cloud
WA_PHONE_NUMBER_ID=<filled in during WhatsApp setup>
WA_BUSINESS_ACCOUNT_ID=<filled in during WhatsApp setup>
WA_ACCESS_TOKEN=<filled in during WhatsApp setup>
WA_VERIFY_TOKEN=<random string, different from META_VERIFY_TOKEN>

# Where Meta calls back to
PUBLIC_URL=https://your-public-domain

# Keep DRY_RUN=1 until you've verified you're sending to the right page
MESSENGER_DRY_RUN=0
```

> The older `WA_ACCOUNT_SID` / `WA_AUTH_TOKEN` / `WA_FROM` env vars are for
> a legacy Twilio/Gupshup notification path that's separate from the Cloud
> API. They coexist; you can ignore them for the Cloud API setup.

### ngrok for local dev

```bash
ngrok http 3000
```

Copy the `https://...ngrok.io` URL it prints. Set `PUBLIC_URL=<that>` in
`.env` and restart the backend. When you restart ngrok later the URL
changes — you have to update both `.env` and the webhook URL in the Meta
dashboard.

### Business Verification — start this NOW

::: tip Critical path
Business Verification is the longest-lead-time blocker — 3–15 days, sometimes
longer if Meta asks for clarifications. Submit it on day one, then code in
parallel. Everything else can be done in a day; this can't.
:::

Business Manager → **Settings → Business Info → Verify Business**.

Upload, in order of importance:

1. Trade License (must match the legal entity name you typed in)
2. NID or passport of the verifier
3. Tax document or utility bill at the registered address
4. Bank statement on company letterhead (sometimes asked for)

Meta replies in 3–15 days.

---

## Step 1 — Messenger

This is Phase 1. Same Facebook app powers Instagram in step 2.

### 1.1 Add Messenger to the app

Meta App Dashboard → **Add Product → Messenger → Set Up**.

### 1.2 Configure the OAuth redirect URI

This is what makes the "Connect with Facebook" button in `/onboarding` work.

1. Meta App Dashboard → **Use Cases → Customize → Permissions → Settings → Valid OAuth Redirect URIs**
2. Add: `${PUBLIC_URL}/onboarding/facebook/callback`
   - In dev: `https://abc123.ngrok.io/onboarding/facebook/callback`
   - In prod: `https://api.your-domain/onboarding/facebook/callback`
3. Restart the backend so it picks up `META_APP_ID`

Now `/onboarding` shows a blue "Connect with Facebook" button. The OAuth
flow is:

```
merchant clicks "Connect with Facebook"
  → POST /onboarding/facebook/start          (backend returns the Facebook URL)
  → browser goes to facebook.com/...          (merchant approves scopes)
  → GET  /onboarding/facebook/callback        (backend swaps code for long-lived token)
  → browser comes back to /onboarding/callback?fb=connected
  → web app calls GET /onboarding/facebook/pages
  → merchant picks page(s); Instagram comes along by default
  → POST /onboarding/facebook/connect         (subscribes webhook, saves the page)
```

If `META_APP_ID` is empty, the OAuth button is hidden and the manual paste
form is shown instead (see step 1.2-bis).

### 1.2-bis Manual paste fallback (only if you skipped OAuth)

For pilot merchants connecting before App Review is approved, or just to
test without OAuth:

1. Meta dashboard → **Messenger → API Settings → Access Tokens**
2. **Add or Remove Pages** → select your test page
3. Click **Generate Token** next to the page row, copy it
4. In `/onboarding`, click "Advanced — paste Page ID + token manually" and submit

That token only lives 1 hour. The OAuth flow exchanges it for a 60-day
token automatically.

### 1.3 Configure the webhook

Meta App Dashboard → **Messenger → Webhooks → Add Callback URL**.

| Field        | Value                                      |
| ------------ | ------------------------------------------ |
| Callback URL | `https://your-public-domain/webhooks/meta` |
| Verify Token | the `META_VERIFY_TOKEN` you set in `.env`  |

Click **Verify and Save**. Meta hits your endpoint with a `GET` containing
`hub.challenge`. Your handler (already wired in `apps/backend/src/webhooks/`)
echoes it back.

If you see "Callback URL could not be validated":

- Is the backend running and reachable at `PUBLIC_URL`?
- Does `META_VERIFY_TOKEN` match exactly (no trailing whitespace)?
- Can you `curl` the endpoint yourself from outside?

Then subscribe to fields: **messages**, **messaging_postbacks**, **message_reads**.

### 1.4 What happens per merchant

When a merchant finishes the OAuth flow:

1. Jobab subscribes their page to the messaging webhook automatically
2. Jobab upserts a `Page` row in the database with the encrypted long-lived token
3. If the page has a linked Instagram Business Account (and the merchant left
   the "Also connect Instagram" checkbox on), Jobab adds a second `Page` row
   with `platform=instagram`

You don't do anything per merchant. That's the whole point.

### 1.5 Permissions to request in App Review

Submit these together with the Instagram ones (step 2.3):

- `pages_messaging` — send/receive DMs
- `pages_manage_metadata` — subscribe page to webhooks
- `pages_read_engagement` — read post comments (for the comment-to-DM flow)
- `pages_manage_engagement` — reply to comments
- `pages_show_list` — list a user's pages during OAuth

Submission materials live in [app-review/](./app-review/).

---

## Step 2 — Instagram

Same Facebook app, same webhook, same code path. Just add permissions and
subscribe the Instagram-Business-Account to a different field.

### 2.1 Prerequisite (per merchant)

The merchant's Instagram has to be:

1. An **Instagram Business Account** (not Personal, not Creator)
2. **Linked to the Facebook Page** they connected in step 1

Most BD merchants who run ads already have this. If not, they do it inside
the Instagram app: Settings → Account → Switch to Professional → Business →
Connect Facebook Page.

### 2.2 Add the Instagram product

Meta App Dashboard → **Add Product → Instagram → Set Up**.

### 2.3 Subscribe Instagram webhook fields

Same Webhooks panel as Messenger. Find **Instagram** in the product list,
subscribe to the **messages** field. Same callback URL — Meta routes by the
`object` field in the payload (`object: "instagram"` vs `object: "page"`).

### 2.4 Per merchant — automatic via OAuth

The OAuth onboarding from step 1 already requests `instagram_basic` and
`instagram_manage_messages`. The picker shows linked Instagram accounts
under each Page, with "Also connect linked Instagram accounts" on by
default. One click and both channels are live.

Instagram DMs land on the same `/webhooks/meta` endpoint.

### 2.5 Permissions to add to the App Review submission

Add to the same submission as step 1.5:

- `instagram_basic`
- `instagram_manage_messages`

---

## Step 3 — WhatsApp

WhatsApp is Phase 2. Its own product. Different webhook, different sender,
different billing, different review.

### 3.1 Create the WhatsApp Business Account

Two models:

- **Jobab-hosted** — you create one WhatsApp Business Account (WABA) and
  attach each merchant's phone number as a separate `phone_number_id`.
  Simpler for merchants, more compliance on you.
- **Merchant-hosted** (via Embedded Signup) — each merchant has their own
  WABA. Cleaner legally, harder onboarding.

For the first 1–5 pilot merchants, do **Jobab-hosted**. After pilot, build
Embedded Signup and switch.

Steps for Jobab-hosted:

1. Business Manager → **Add Account → WhatsApp Account → Create**
2. Inside the WABA, **Add Phone Number**. The number can't be in any
   personal WhatsApp app or the WhatsApp Business app
3. Verify via SMS or voice (enter the OTP)
4. Pick a **Display Name** (e.g. "Rongdhonu Saree"). Meta reviews this in
   1–3 days. Common rejection reasons: too generic, contains a URL, sounds
   promotional

You now have a `phone_number_id` (long numeric string) and a
`whatsapp_business_account_id`.

### 3.2 Generate a System User access token

Page Access Tokens expire in 60 days. For WhatsApp you want a token that
doesn't expire.

1. Business Manager → **Settings → Users → System Users → Add**
2. Name: `Jobab WA Sender`. Role: **Admin**
3. Click the user → **Generate New Token** → app: `Jobab` →
   permissions: `whatsapp_business_messaging`, `whatsapp_business_management`
4. Set "Never expires". Copy and store as `WA_ACCESS_TOKEN`

### 3.3 Configure the WhatsApp webhook

App Dashboard → **WhatsApp → Configuration → Webhooks**.

| Field        | Value                                                              |
| ------------ | ------------------------------------------------------------------ |
| Callback URL | `https://api.your-domain/webhooks/whatsapp`                        |
| Verify Token | `WA_VERIFY_TOKEN` from `.env` (different from `META_VERIFY_TOKEN`) |

Subscribe to: **messages**, **message_status**.

::: warning Phase 2 build
`/webhooks/whatsapp` doesn't exist in the codebase yet — it's part of the
WhatsApp Cloud API integration we ship in Phase 2. Configure this in Meta
only after the controller actually exists.
:::

### 3.4 Submit message templates

WhatsApp → **Message Templates → Create Template**.

Submit these 7 in parallel — utility category, fast approval (~24h each):

| Name               | Body example                                                         |
| ------------------ | -------------------------------------------------------------------- |
| `order_confirmed`  | আপনার অর্ডার #{{1}} নিশ্চিত হয়েছে। মোট: ৳{{2}}। পেমেন্ট লিংক: {{3}} |
| `order_shipped`    | অর্ডার #{{1}} পাঠানো হয়েছে। ট্র্যাকিং: {{2}}                        |
| `order_delivered`  | অর্ডার #{{1}} পৌঁছেছে। ধন্যবাদ!                                      |
| `payment_received` | ৳{{1}} পেমেন্ট পেয়েছি। অর্ডার #{{2}} প্রসেস হচ্ছে।                  |
| `payment_reminder` | অর্ডার #{{1}} এর পেমেন্ট এখনো পাইনি। লিংক: {{2}}                     |
| `back_in_stock`    | {{1}} এখন স্টকে আছে। অর্ডার করুন: {{2}}                              |
| `cart_abandoned`   | আপনার অর্ডার অসম্পূর্ণ আছে। শেষ করুন: {{1}}                          |

### 3.5 Add the env vars

```ini
WA_PROVIDER=cloud
WA_PHONE_NUMBER_ID=<from WABA dashboard>
WA_BUSINESS_ACCOUNT_ID=<from WABA dashboard>
WA_ACCESS_TOKEN=<the System User token from 3.2>
WA_VERIFY_TOKEN=<random string, different from META_VERIFY_TOKEN>
```

### 3.6 Insert the WhatsApp page row (per merchant)

Until the Embedded Signup flow is built, insert directly:

```sql
INSERT INTO "Page" (id, "organizationId", "platform", "externalPageId", "accessToken", "status")
VALUES (
  gen_random_uuid()::text,
  '<org id>',
  'whatsapp',
  '<phone_number_id>',
  '<encrypted WA_ACCESS_TOKEN>',
  'connected'
);
```

The token must be encrypted with `ENCRYPTION_KEY` — easiest is a small seed
script. The encryption pattern is in `apps/backend/src/common/encryption/`.

---

## Step 4 — Prove it works (smoke tests)

Before onboarding a real merchant.

### 4.1 Messenger smoke test

1. Open your test Facebook Page (whose token you have)
2. From a _different_ personal account, DM the page:
   `"lal jamdani shari ache?"`
3. Watch the backend logs. You should see:
   - `POST /webhooks/meta` with the message payload
   - Webhook signature verified (no `INVALID_SIGNATURE` error)
   - Job enqueued to BullMQ
   - Worker picks it up, calls the LLM, calls the Send API
4. The personal account receives a reply

If the personal account isn't an admin of the page and you're in dev mode,
add them as a tester: App Dashboard → Roles → Testers → Add.

### 4.2 Instagram smoke test

Same as Messenger, but DM the linked Instagram Business Account. The
webhook payload arrives at the same `/webhooks/meta` URL with
`object: "instagram"`.

### 4.3 WhatsApp smoke test

Send yourself a free-form message:

```bash
curl -X POST \
  "https://graph.facebook.com/v22.0/${WA_PHONE_NUMBER_ID}/messages" \
  -H "Authorization: Bearer ${WA_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "8801XXXXXXXXX",
    "type": "text",
    "text": { "body": "test from jobab" }
  }'
```

You should get it on your phone. Reply from the phone → the webhook should
fire at `/webhooks/whatsapp` (once that's built).

### 4.4 End-to-end smoke (using the CLI)

The backend ships a fake-customer CLI that runs the full AI loop:

```bash
DEFAULT_PAGE_ID=page_rongdhonu pnpm --filter @jobab/backend send -- \
  --customer fb_tahmina "lal jamdani shari ache? medium lagbe"
```

With `MESSENGER_DRY_RUN=0` and a real page connected, this triggers the
real Send API call.

---

## Step 5 — From dev mode to live

```
Day 0    App created, in Development Mode (up to 25 testers, no review)
Day 0    Submit Business Verification
Day 1    Build OAuth flow (done in current code)
Day 2    Long-lived token exchange, encrypted storage (done in current code)
Day 5    Privacy policy + ToS + data deletion endpoint go live
Day 7    Record App Review screencasts
Day 7    Submit App Review for Messenger + Instagram permissions together
Week 2-8 Iterate on Meta's review feedback
Day X    All permissions approved → switch app to Live mode
Day X    Non-tester merchants can connect via OAuth
Week 10  WA templates approved, WA Embedded Signup live
Week 12  WhatsApp ready for first non-pilot merchant
```

---

## Troubleshooting

| What you see                                  | What's wrong                                                              | What to do                                                                       |
| --------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| "Callback URL could not be validated"         | `PUBLIC_URL` unreachable, or `META_VERIFY_TOKEN` mismatch                 | `curl` your endpoint from outside; check the token char-for-char                 |
| Webhook GET works, POST never arrives         | Page not subscribed to webhook fields                                     | The OAuth `connect` does this; re-run it or re-subscribe via curl                |
| `INVALID_SIGNATURE` on POST                   | `META_APP_SECRET` wrong, or middleware modified the body                  | Webhook controller must read the **raw** body before any JSON parser             |
| Send API returns `(#10) Permission denied`    | App in Development Mode, recipient isn't a tester                         | Add the recipient as a tester, or wait for App Review                            |
| Send API returns `(#100) Param recipient[id]` | PSID is from a different app                                              | Use the PSID from the webhook payload, not from another app                      |
| WA `(#131030) Recipient not in allowed list`  | App not approved for that recipient                                       | In dev only 5 recipients allowed — add the phone in WhatsApp → Configuration     |
| WA template rejected for "vague content"      | Body too generic, or promotional wording in a Utility template            | Add a specific order/ID variable; move marketing wording to a Marketing template |
| Instagram webhook fires but user info missing | Page not subscribed for that IG account, or account isn't Business-linked | Verify in Instagram app: Settings → Account → linked Facebook Page exists        |
| Long-lived token expires after 60 days        | The token rotation cron isn't running                                     | Wire `TokenRotationService` to `@nestjs/schedule` (Phase 1 follow-up)            |

---

## Related docs

- [Channel plan](./1-channel-plan.md) — why two phases, why this order
- [App Review submission kit](./app-review/) — exactly what to put in App Review
- [Pilot launch plan](./pilot/) — onboarding the first 3–5 merchants under dev mode
- [Local setup](../build/1-setup.md) — get the backend running first
- [Privacy policy](../legal/privacy-policy.md), [data deletion](../legal/data-deletion.md) — public URLs Meta requires
