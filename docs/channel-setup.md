# Channel setup — step-by-step

How to wire Messenger, Instagram, and WhatsApp into a running Jobab instance.

This is the **operator guide** — do these steps in order and you'll have a
merchant page replying through the AI by the end. For the _why_ and _when_
of each channel, see [`integrations.md`](./integrations.md).

> **Convention:** boxes marked **[once]** are one-time setup for your Meta
> developer account. Boxes marked **[per-merchant]** repeat for each new
> merchant you onboard.

> ### ⚠️ Platform realities you must know before setting up channels
>
> - **Inside the 24-hour customer-service window** (after the customer's last
>   message): AI free-form replies — fully allowed, no cost, no review needed.
>   This is the core product.
> - **Outside 24h on Messenger** in Bangladesh: **blocked**. Meta deprecated
>   `POST_PURCHASE_UPDATE` / `CONFIRMED_EVENT_UPDATE` / `ACCOUNT_UPDATE` tags
>   globally on Feb 9, 2026. The replacement (Utility Messages) is in open
>   beta in only US/VN/TH/PH — not Bangladesh.
> - **Outside 24h on WhatsApp**: allowed via pre-approved templates only,
>   billed per message. Service messages inside 24h stay free.
> - **HUMAN_AGENT tag**: do not use for AI replies. Meta detects misuse and
>   revokes API access — it's intended for real human agents only.
> - **Instagram rate limit**: 200 DMs/hour per merchant account (cut from
>   5,000 in late 2024). Plus a 1-DM-per-user-per-24h cap on comment/story
>   triggers as of 2026.
> - **WhatsApp pricing**: moved from per-conversation to per-message billing
>   on July 1, 2025. Old per-conversation math is obsolete.

---

## Table of contents

- [0. Global prerequisites](#0-global-prerequisites-once)
- [1. Messenger setup](#1-messenger-setup)
- [2. Instagram setup](#2-instagram-setup)
- [3. WhatsApp setup](#3-whatsapp-setup)
- [4. Smoke tests for each channel](#4-smoke-tests-for-each-channel)
- [5. Going from dev mode → live](#5-going-from-dev-mode--live)
- [6. Troubleshooting](#6-troubleshooting)

---

## 0. Global prerequisites [once]

You'll do these once for the Jobab company, regardless of channel.

### 0.1 — Accounts you need

| Account                          | Where                                                      | Cost                            |
| -------------------------------- | ---------------------------------------------------------- | ------------------------------- |
| Meta Business Account            | [business.facebook.com](https://business.facebook.com)     | free                            |
| Meta Developer account           | [developers.facebook.com](https://developers.facebook.com) | free                            |
| WhatsApp Business Account (WABA) | inside Business Manager                                    | free (per-conversation billing) |
| A public HTTPS URL for webhooks  | ngrok / Cloudflare Tunnel (dev), Fly/Render/Vercel (prod)  | free tier OK                    |

### 0.2 — Create the Meta App

1. Go to [developers.facebook.com/apps](https://developers.facebook.com/apps) → **Create App**.
2. Use case: **Other** → type: **Business**.
3. App name: `Jobab`. Contact email: your business email.
4. Attach it to your Meta Business Account (created above).

You now have an **App ID** and **App Secret**. Keep the secret out of git.

### 0.3 — Host public URLs

Three URLs must be publicly reachable before any review or webhook works:

| Purpose                | Path                                                     | Source                                                      |
| ---------------------- | -------------------------------------------------------- | ----------------------------------------------------------- |
| Privacy Policy         | `https://jobab.yoursite/privacy`                         | [`docs/legal/privacy-policy.md`](./legal/privacy-policy.md) |
| Terms of Service       | `https://jobab.yoursite/terms`                           | draft from privacy policy                                   |
| Data Deletion callback | `https://api.jobab.yoursite/webhooks/meta/data-deletion` | [`docs/legal/data-deletion.md`](./legal/data-deletion.md)   |

In dev, ngrok works for the webhook callbacks but Meta requires the privacy/ToS
URLs to be stable — host them on a real domain even during dev.

### 0.4 — Backend env vars (one set for the whole company)

Add to `apps/backend/.env`:

```ini
# Meta — shared across Messenger + Instagram
# META_APP_ID is required for the OAuth "Connect with Facebook" button.
# Without it, /onboarding falls back to the manual paste form.
META_APP_ID=<from Meta dashboard>
META_APP_SECRET=<from Meta dashboard>
META_VERIFY_TOKEN=<any random string you invent, used in webhook handshake>
META_GRAPH_VERSION=v22.0

# WhatsApp Cloud API
WA_PROVIDER=cloud                       # 'cloud' = Meta Cloud API. 'twilio'/'gupshup' = old notification path
WA_PHONE_NUMBER_ID=<from WABA dashboard, per-WABA>
WA_BUSINESS_ACCOUNT_ID=<from WABA dashboard>
WA_ACCESS_TOKEN=<System User token>
WA_VERIFY_TOKEN=<any random string, separate from META_VERIFY_TOKEN>

# Public URL — webhooks register here
PUBLIC_URL=https://api.jobab.yoursite

# Dev safety: keep DRY_RUN=1 until you've verified you're sending to the right page
MESSENGER_DRY_RUN=0                     # 1 in dev, 0 once you're ready to send for real
```

> The existing `WA_*` env vars (`WA_ACCOUNT_SID`, `WA_AUTH_TOKEN`, `WA_FROM`)
> are for the legacy **Twilio/Gupshup notification path**. Cloud API uses a
> different set — they coexist.

### 0.5 — ngrok for local dev

```bash
ngrok http 3000
# copy the https:// URL; set PUBLIC_URL=<that> in .env and restart the backend
```

Re-do this when the ngrok URL changes — Meta caches the webhook URL in your
app config, so update there too (see step 1.3).

### 0.6 — Business Verification (start now, takes weeks)

Business Manager → **Settings → Business Info → Verify Business**.

Upload, in this order of importance:

1. Trade License (must match the legal entity name you typed)
2. NID / passport of the verifier (you)
3. Tax document or utility bill at the registered address
4. Bank statement on company letterhead (sometimes asked for)

Meta replies in **3–15 days**. Submit before you start coding — it's the
critical-path blocker for all three channels in production.

---

## 1. Messenger setup

This is **Phase 1**. Volume leader. Cheapest. Same App ID as Instagram.

### 1.1 — Add Messenger to the app [once]

Meta App Dashboard → **Add Product → Messenger → Set Up**.

### 1.2 — Configure the OAuth redirect URI [once]

The "Connect with Facebook" button in `apps/web/app/onboarding` walks the
merchant through Facebook Login and picks pages on their behalf. To enable it:

1. Set `META_APP_ID` in `apps/backend/.env` (you got this from step 0.2).
2. Meta App Dashboard → **Use Cases → Customize → Permissions → Settings →
   Valid OAuth Redirect URIs**.
3. Add: `${PUBLIC_URL}/onboarding/facebook/callback` — e.g.
   `https://abc123.ngrok.io/onboarding/facebook/callback` in dev,
   `https://api.jobab.yoursite/onboarding/facebook/callback` in prod.
4. Restart the backend so it picks up `META_APP_ID`.

The web app now shows a blue "Connect with Facebook" button instead of (or
above) the manual paste form. The flow is:

```
merchant clicks Connect with Facebook
  → POST /onboarding/facebook/start          (returns { url })
  → browser navigates to facebook.com/...    (user approves scopes)
  → GET  /onboarding/facebook/callback       (backend exchanges code → long-lived token)
  → browser bounced to /onboarding/callback?fb=connected
  → web app calls GET /onboarding/facebook/pages
  → merchant picks page(s) (linked IG accounts auto-included by default)
  → POST /onboarding/facebook/connect        (subscribes webhook, upserts Page rows)
```

If `META_APP_ID` is unset, the OAuth button is hidden and only the manual
paste form is shown (step 1.2-bis below).

### 1.2-bis — Manual paste fallback [optional, dev only]

For pilot merchants connecting before App Review is approved, or for testing
without OAuth:

1. Settings → **Messenger → API Settings → Access Tokens**.
2. **Add or Remove Pages** → select the merchant's page (or your own test page).
3. Click **Generate Token** next to the page row. Copy it.
4. In `/onboarding`, click "Advanced — paste Page ID + token manually" and
   submit. Backend route: `POST /onboarding/pages`.

This is a **short-lived** token (1h). The OAuth flow above exchanges it for a
long-lived one automatically.

### 1.3 — Configure the webhook [once]

Messenger → **Webhooks → Add Callback URL**.

| Field        | Value                                      |
| ------------ | ------------------------------------------ |
| Callback URL | `https://api.jobab.yoursite/webhooks/meta` |
| Verify Token | the `META_VERIFY_TOKEN` you set in `.env`  |

Click **Verify and Save** — Meta hits your endpoint with a `GET` containing
`hub.challenge`; your handler echoes it back. If you get "Callback URL could
not be validated," check:

- Backend is running and reachable at `PUBLIC_URL`
- `META_VERIFY_TOKEN` matches exactly (no trailing whitespace)
- `/webhooks/meta` GET handler is wired (it is — `apps/backend/src/webhooks/`)

Then subscribe to fields: **messages**, **messaging_postbacks**, **message_reads**.

### 1.4 — Webhook subscription + Page row [per-merchant, automatic via OAuth]

When the merchant finishes the OAuth flow above, the backend automatically:

1. Calls `POST graph.facebook.com/<page>/subscribed_apps` to subscribe the
   page to `messages`, `messaging_postbacks`, `message_reads`.
2. Upserts a `Page` row with the encrypted long-lived Page Access Token.
3. If the page has a linked Instagram Business Account (and the merchant
   left the "Also connect Instagram" checkbox on), upserts a second Page row
   with `platform=instagram`.

You don't need to do anything per-merchant — that's the whole point of the
OAuth flow. The manual curl + SQL path below only exists for the paste-token
fallback (1.2-bis).

<details>
<summary>Manual fallback (only if you skipped OAuth)</summary>

```bash
# 1. Subscribe page to webhook fields
curl -X POST \
  "https://graph.facebook.com/v22.0/<PAGE_ID>/subscribed_apps" \
  -d "subscribed_fields=messages,messaging_postbacks,message_reads" \
  -d "access_token=<PAGE_ACCESS_TOKEN>"

# 2. POST /onboarding/pages does the encrypted upsert for you — just hit the
#    "Advanced" form in /onboarding and submit Page ID + token.
```

</details>

### 1.6 — Required permissions for App Review

Submit these together (you'll batch them with Instagram in step 2):

- `pages_messaging` — send/receive DMs
- `pages_manage_metadata` — subscribe page to webhook
- `pages_read_engagement` — read posts (for the comment-to-DM flow)
- `pages_manage_engagement` — reply to comments
- `pages_show_list` — list a user's pages during OAuth
- `business_management` — multi-page apps (optional but recommended)

Submission kit lives in [`docs/meta-review/`](./meta-review/).

---

## 2. Instagram setup

**Same app, same webhook, same code path** — just add permissions and subscribe
the IG-Business-Account-linked-to-the-Page to a different field.

### 2.1 — Prerequisite [per-merchant]

The merchant's Instagram account must be:

1. An **Instagram Business Account** (not Personal, not Creator)
2. **Linked to the Facebook Page** they connected in step 1

Most BD merchants who run paid ads already have this. If not, they do it inside
the Instagram app: Settings → Account → Switch to Professional → Business →
Connect Facebook Page.

### 2.2 — Add the Instagram product [once]

Meta App Dashboard → **Add Product → Instagram → Set Up**.

### 2.3 — Subscribe IG webhook fields [once]

Same Webhooks panel as Messenger. Find **Instagram** in the product list,
subscribe to the **messages** field. Same callback URL — Meta routes by
the `object` field in the payload.

### 2.4 — Instagram is auto-connected by the OAuth flow [per-merchant]

The OAuth onboarding (Messenger §1.2) already requests `instagram_basic` +
`instagram_manage_messages`. The picker shows linked IG accounts inline under
each Page, and "Also connect linked Instagram accounts" is on by default. So
the merchant clicks once and both channels are live.

Instagram DMs land on the **same `/webhooks/meta` endpoint** — the payload
has `object: "instagram"` instead of `object: "page"` and the handler routes
on that.

### 2.5 — Additional permissions for App Review

Add these to the same submission as step 1.6:

- `instagram_basic`
- `instagram_manage_messages`

---

## 3. WhatsApp setup

WhatsApp is its own product. Different webhook, different sender, different
billing, different review path.

### 3.1 — Create the WhatsApp Business Account [once or per-merchant]

Two models:

- **Jobab-hosted:** you create one WABA, attach merchants' phone numbers as
  separate `phone_number_id`s. Simpler for merchants, more compliance on you.
- **Merchant-hosted** (recommended via Embedded Signup): each merchant has
  their own WABA. Cleaner legally, harder onboarding.

For pilot (1–5 merchants): do **Jobab-hosted**. After pilot, build Embedded
Signup and switch to merchant-hosted.

Steps for Jobab-hosted:

1. Business Manager → **Add Account → WhatsApp Account → Create**.
2. Inside the WABA, **Add Phone Number** — you need a number that is **not**
   in any personal WhatsApp app and **not** in the WhatsApp Business app.
3. Choose **SMS** or **Voice** verification, enter the OTP.
4. Set a **Display Name** (e.g., "Rongdhonu Saree"). Meta reviews this in 1–3
   days. Reject reasons: too generic, contains URL, sounds like spam.

You now have a `phone_number_id` (long numeric string) and a
`whatsapp_business_account_id`.

### 3.2 — Generate a System User access token [once]

Page Access Tokens are short-lived; for WA you want a permanent token:

1. Business Manager → **Settings → Users → System Users → Add**.
2. Name: `Jobab WA Sender`. Role: **Admin**.
3. Click the user → **Generate New Token** → app: `Jobab` →
   permissions: `whatsapp_business_messaging`, `whatsapp_business_management`.
4. **Never-expires**. Copy and store as `WA_ACCESS_TOKEN`.

### 3.3 — Configure the WhatsApp webhook [once]

App Dashboard → **WhatsApp → Configuration → Webhooks**.

| Field        | Value                                                  |
| ------------ | ------------------------------------------------------ |
| Callback URL | `https://api.jobab.yoursite/webhooks/whatsapp`         |
| Verify Token | `WA_VERIFY_TOKEN` from `.env` (different from Meta's!) |

Subscribe to: **messages**, **message_status** (for sent/delivered/read).

> **The `/webhooks/whatsapp` endpoint does not exist yet** — see Phase 3 in
> the integrations plan. Build the controller before configuring this in Meta.

### 3.4 — Submit message templates [once + as needed]

WhatsApp → **Message Templates → Create Template**.

Start with these 7 (utility category → fast approval):

| Name               | Body example                                                         |
| ------------------ | -------------------------------------------------------------------- |
| `order_confirmed`  | আপনার অর্ডার #{{1}} নিশ্চিত হয়েছে। মোট: ৳{{2}}। পেমেন্ট লিংক: {{3}} |
| `order_shipped`    | অর্ডার #{{1}} পাঠানো হয়েছে। ট্র্যাকিং: {{2}}                        |
| `order_delivered`  | অর্ডার #{{1}} পৌঁছেছে। ধন্যবাদ!                                      |
| `payment_received` | ৳{{1}} পেমেন্ট পেয়েছি। অর্ডার #{{2}} প্রসেস হচ্ছে।                  |
| `payment_reminder` | অর্ডার #{{1}} এর পেমেন্ট এখনো পাইনি। লিংক: {{2}}                     |
| `back_in_stock`    | {{1}} এখন স্টকে আছে। অর্ডার করুন: {{2}}                              |
| `cart_abandoned`   | আপনার অর্ডার অসম্পূর্ণ আছে। শেষ করুন: {{1}}                          |

Each takes ~24h to approve. Submit all 7 in parallel.

### 3.5 — Add WhatsApp env vars

```ini
WA_PROVIDER=cloud
WA_PHONE_NUMBER_ID=<from WABA dashboard>
WA_BUSINESS_ACCOUNT_ID=<from WABA dashboard>
WA_ACCESS_TOKEN=<System User token from 3.2>
WA_VERIFY_TOKEN=<random string, different from META_VERIFY_TOKEN>
```

### 3.6 — Insert the WA page row [per-merchant]

```sql
INSERT INTO "Page" (id, "shopId", "platform", "externalId", "name", "accessToken")
VALUES (
  gen_random_uuid()::text,
  '<shop id>',
  'WHATSAPP',
  '<phone_number_id>',
  '+8801XXXXXXXXX',
  '<encrypted WA_ACCESS_TOKEN>'
);
```

---

## 4. Smoke tests for each channel

After setup, prove the loop works end-to-end before onboarding a real merchant.

### 4.1 — Messenger smoke test

1. Open your test Facebook Page (the one whose token you have).
2. From a _different_ personal account, send the page a DM:
   `"lal jamdani shari ache?"`
3. Watch the backend logs — you should see:
   - `POST /webhooks/meta` with the message payload
   - Webhook signature verified (no `INVALID_SIGNATURE` error)
   - Job enqueued to BullMQ
   - Worker picks it up, calls LLM, calls Send API
4. The personal account receives a reply.

If the personal account is not an admin of the page and you're in dev mode,
**add them as a tester**: App Dashboard → Roles → Testers → Add.

### 4.2 — Instagram smoke test

Same as Messenger, but DM the merchant's Instagram Business Account. Webhook
payload arrives at the same `/webhooks/meta` URL with `object: "instagram"`.

### 4.3 — WhatsApp smoke test

```bash
# Send a free-form message from the API (only works within 24h window;
# for first test, message your own phone, then your phone replies, then send this)
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

You should receive it on the phone. Reply from the phone → webhook should
fire at `/webhooks/whatsapp`.

### 4.4 — End-to-end smoke (all three)

The repo ships a fake-customer CLI for the full AI loop:

```bash
DEFAULT_PAGE_ID=page_rongdhonu pnpm --filter @jobab/backend send -- \
  --customer fb_tahmina "lal jamdani shari ache? medium lagbe"
```

With `MESSENGER_DRY_RUN=0` and a real page connected, this triggers the real
Send API call.

---

## 5. Going from dev mode → live

The flow once Phase 1 is built out:

```
Day 0    App created in Development Mode
Day 0    Up to 25 testers can use full permissions — onboard pilot merchants here
Day 0    Submit Business Verification
Day 1    Build OAuth flow (Facebook Login) in apps/web/app/onboarding
Day 2    Long-lived token exchange, encrypted storage
Day 5    Privacy policy + ToS + data deletion endpoint go live
Day 7    Record App Review screencasts (one per permission)
Day 7    Submit App Review for FB + IG permissions together
Week 2-8 Iterate on Meta's review feedback
Day X    All permissions approved → switch app to Live mode
Day X    Non-tester merchants can now connect via OAuth
Week 10  WA templates approved, WA Embedded Signup live
Week 12  WhatsApp ready for first non-pilot merchant
```

The **OAuth flow** in `apps/web/app/onboarding` is what replaces all the
manual "generate token → SQL insert" steps in this guide. The CLI/SQL path
above is fine for the first 3–5 pilot merchants.

---

## 6. Troubleshooting

| Symptom                                       | Likely cause                                                                 | Fix                                                                                |
| --------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| "Callback URL could not be validated"         | `PUBLIC_URL` not reachable, or `META_VERIFY_TOKEN` mismatch                  | Curl your own endpoint from outside the network; check token char-for-char         |
| Webhook GET works, POST never arrives         | Page not subscribed to webhook fields                                        | Re-run the `/subscribed_apps` POST from step 1.4                                   |
| `INVALID_SIGNATURE` on POST                   | `META_APP_SECRET` wrong, or the body was modified by middleware              | Ensure the webhook controller reads the **raw** body before any JSON parser        |
| Send API returns `(#10) Permission denied`    | App in Development Mode, recipient is not a tester                           | Add the recipient as a tester, or wait for App Review                              |
| Send API returns `(#100) Param recipient[id]` | PSID not from your page; pages have different PSIDs per app                  | Use the PSID from the webhook payload, not from another app                        |
| WA `(#131030) Recipient not in allowed list`  | App not approved for that recipient yet                                      | In dev, only 5 recipients allowed — add the phone in WhatsApp → Configuration      |
| WA template rejected for "vague content"      | Template body too generic or sounds promotional in Utility category          | Add a specific order #/ID variable, move marketing wording to a Marketing template |
| IG webhook fires but user info is missing     | Page not subscribed for that IG account, or account not Business-linked      | Verify in IG app: Settings → Account → linked Facebook Page exists                 |
| Long-lived token expires after 60 days        | `business_management` permission missing, or token rotation cron not running | Add `business_management` to OAuth scope; build the rotation job                   |

---

## Related docs

- [`integrations.md`](./integrations.md) — the strategic plan (why this order, what's missing in code)
- [`meta-review/`](./meta-review/) — App Review submission materials
- [`pilot/`](./pilot/) — onboarding the first 3–5 merchants under dev mode
- [`runbook.md`](./runbook.md) — local dev + production operations
- [`legal/privacy-policy.md`](./legal/privacy-policy.md), [`legal/data-deletion.md`](./legal/data-deletion.md) — public URLs required by Meta
