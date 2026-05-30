# Meta App Review — submission kit

The longest-lead-time blocker for going live. Submit before any other prep
work — Meta's review queue is 2-6 weeks on a good run.

## What we're asking Meta to approve

| Permission                | Why we need it                                                              |
| ------------------------- | --------------------------------------------------------------------------- |
| `pages_messaging`         | Read DMs to a connected Page, reply on the Page's behalf. The core product. |
| `pages_manage_metadata`   | Subscribe the Page to the messages webhook.                                 |
| `pages_read_engagement`   | Read post comments for the comment-to-DM flow (§10).                        |
| `pages_manage_engagement` | Post the public reply to comments + send the private (DM) reply.            |
| `business_management`     | (Optional, only if the merchant wants the page-token rotation flow.)        |

## Required materials

- [`use-case.md`](./use-case.md) — written description of the merchant
  experience Meta reviewers see. Paste into "How will your app use this
  permission?" boxes.
- [`screencast-script.md`](./screencast-script.md) — shot-by-shot script
  for the screen recording each permission requires (3-5 min each).
- [`test-credentials.md`](./test-credentials.md) — Meta needs a working
  test user that can demo the whole flow. Fill in once you create one.
- [`privacy-policy.md`](../../legal/privacy-policy.md) — public URL required.
- [`data-deletion.md`](../../legal/data-deletion.md) — public URL required.

## Pre-submit checklist

- [ ] App is in **Development → Live** mode
- [ ] Business Verification submitted (this gates `pages_messaging` Advanced Access)
- [ ] Privacy policy URL is public and accessible without auth
- [ ] Data Deletion callback URL is configured + returns 200 to Meta's signed_request
- [ ] One real (test) Facebook Page with the app connected
- [ ] Three test conversations seeded (greet / price ask / order)
- [ ] Screen recording for each permission, captioned
- [ ] **App icon, app name "Jobab", category "Business"**, all set in the dashboard

## After submission

- Reviewer questions usually arrive in the dashboard within 5-10 business days.
- Respond same day. Keep the test credentials hot — reviewers retry weeks later.
- If rejected, the dashboard notes the exact policy clause. Treat it as code:
  fix, re-record screencast, re-submit.

## Tactical advice

- **Don't use a personal Facebook account** for the app. Use a Business
  Manager + a service-account Facebook user.
- **Don't hide the "AI assistant" nature** of the product. Meta has
  rejected apps for misrepresenting that messages are auto-generated.
  Put it in the merchant's Page bio template and in the customer-facing
  disclosure toggle.
- **The screencast must show the user-initiated flow**: customer DMs the
  Page → AI replies. Reviewers want to see why the permission is necessary.
