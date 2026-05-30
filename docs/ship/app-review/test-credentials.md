# Test credentials for Meta App Review

Reviewers will retry your test login weeks after submission. Keep these
hot until approval lands.

## Dashboard login

URL: `https://[your-domain]/login`
Email: `meta-review@jobab.com`
Password: `[put in here, share via Meta dashboard's "Test Login" field]`

## What the reviewer sees after login

- Onboarded merchant: "Rongdhonu Boutique"
- 3 seeded conversations (Tahmina / Nusrat / Sadia) with pre-made
  customer messages
- 1 seeded order
- Comments page with 1 seeded comment + DM bridge

## Test Facebook user

Created in App Dashboard → Roles → Test Users.

- Test user name: Jobab Review Bot
- Test user PSID: `[fill in]`
- Test Page: `[fill in name + id]`

## Sending a test DM as the reviewer

The reviewer opens Messenger as the test user, sends the test Page a DM.
Within ~2s the AI replies. The reviewer sees the message + reply both
on Messenger (as the test user) and in the Jobab dashboard (as the
merchant).

## Resetting between review rounds

If Meta rejects and you fix-and-resubmit, run:

```
pnpm --filter @jobab/backend prisma:reset
pnpm --filter @jobab/backend seed
```

…to put the demo back into a known state. Re-record the screencast if
behaviour changed.

## What NOT to do

- Don't give Meta a personal Facebook account. They'll mark the app as
  abuse-risk.
- Don't make the test user's password ephemeral. Reviewers retry weeks
  after submission.
- Don't put production data in the demo merchant. Reviewers will see it.
