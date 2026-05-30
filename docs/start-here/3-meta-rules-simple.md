# Meta's rules, in plain English

If you've ever wondered "why can't the AI just message customers whenever?" —
this is the answer. Meta has strict rules about when and what businesses can
send. Jobab follows them.

## The shop analogy

Think of Facebook Messenger like a physical shop:

- A customer **walks into** your shop when they message you
- You can **talk freely** while they're inside or just left
- After **24 hours**, the door closes — you can't shout at them across the street
- You can **never** walk up to random strangers and pitch (no cold DMs)

That's basically it. The rest is detail.

## The four rules

### Rule 1 — The customer must talk first

You can't initiate a conversation. Ever. The customer DMs you, _then_ you
have permission to reply.

This means Jobab can't be used for cold outreach. It only answers messages
that arrive. (For sending "new collection" announcements, see WhatsApp
templates below.)

### Rule 2 — You have 24 hours of free conversation

Once a customer messages you, a 24-hour timer starts. Inside those 24 hours
you can:

- Send unlimited text replies
- Send photos, prices, options
- Take the order
- Send a bKash payment link
- Follow up with questions

Every new message from the customer resets the timer to 24 hours.

**This is where 90% of Jobab's work happens.** It's free, it's unlimited,
no Meta approval needed.

### Rule 3 — After 24 hours on Messenger, the door closes (for Bangladesh)

If the customer goes quiet for 24+ hours, you can't message them on Facebook
Messenger anymore. Not even "your order shipped." Meta used to allow special
"message tags" for transactional updates — they killed those tags globally on
**February 9, 2026**. The replacement (Utility Messages) is in beta in only
4 countries, and **Bangladesh is not one of them**.

So for "your order shipped" notifications: use WhatsApp, or SMS, or call.

### Rule 4 — WhatsApp has its own door, with a checklist

WhatsApp is more lenient than Messenger, but stricter than it used to be.

Inside the 24-hour window: free, unlimited, just like Messenger.

Outside the 24-hour window: you can send a message, BUT it has to use a
**template** that Meta pre-approved. You write a template once like:

> "Hi {{name}}, your order #{{order_id}} has been shipped. Track here: {{link}}"

Meta reviews the template (usually within a day). Once approved, you can send
it to any customer. **You pay per message.** (Pricing varies — Bangladesh is
in the "Rest of Asia Pacific" tier. Numbers change quarterly.)

## What this means for Jobab in practice

```
Customer messages "lal jamdani shari ache?"
    │
    ▼
24-hour timer starts ⏱️
    │
    ▼
AI does all of this FREELY:
    • answers in Bangla
    • shows the product
    • takes the order
    • sends bKash link
    • confirms payment
    • hands off if there's a complaint
    │
    ▼
24 hours later, customer is quiet
    │
    ▼
Time to notify "your order shipped"?
    • Messenger ─► ❌ blocked for Bangladesh
    • WhatsApp template ─► ✅ "order_shipped" template (paid)
    • SMS ─► ✅ always works
    • Phone call ─► ✅ always works
```

## What Jobab must NOT do (or Meta will ban us)

| Don't                                                           | Why                                                  |
| --------------------------------------------------------------- | ---------------------------------------------------- |
| Cold-DM users who never messaged the page                       | Spam — instant ban                                   |
| Use the HUMAN_AGENT tag for AI replies                          | Meta detects misuse — fastest way to lose API access |
| Send marketing messages on Messenger outside 24h in Bangladesh  | Not allowed; only EU/UK/JP/KR/AU can                 |
| Send WhatsApp messages outside 24h without an approved template | Account flagged                                      |
| Send the same template to thousands of cold contacts            | Quality rating drops, account restricted             |
| Pretend the AI is a human                                       | Meta policy violation                                |

## What Jobab IS allowed to do

| Allowed                                                          | Where                                   |
| ---------------------------------------------------------------- | --------------------------------------- |
| AI answers in Bangla, takes orders, sends payment links          | Inside 24h, all channels                |
| Photo → product matching                                         | Inside 24h, all channels                |
| Merchant takes over and replies manually                         | Inside 24h normally; 7 days on WhatsApp |
| "Order shipped" / "delivered" / "payment received" notifications | WhatsApp template, anytime              |
| Reply to a public Facebook comment with a private DM             | Up to 7 days after the comment          |

## The Instagram-only rule

Instagram is the same as Messenger with one extra limit: **200 DMs per hour
per merchant account.** This is shared across every tool the merchant uses
(Jobab + any other). Plus comment-triggered DMs are capped at one per user
per 24 hours.

For a tiny shop this doesn't matter. For a viral post it does.

## Why we built the 24-hour window guard

If a merchant tries to reply to a customer through the inbox after the window
closed, Jobab refuses and shows the merchant why. We don't want to silently
fail and confuse anyone. The guard lives in
`apps/backend/src/messenger/messenger.service.ts` and returns a clear error.

The inbox UI checks `GET /conversations/:id/messaging-window` before letting
the merchant type, and greys the composer out if the window is closed.

## Sources

The rules above come from Meta's docs and recent policy updates. The full
chain of evidence is in [ship/1-channel-plan.md](../ship/1-channel-plan.md)
and [ship/2-meta-setup.md](../ship/2-meta-setup.md).

## Next

- See how this shapes the rollout plan: [ship/1-channel-plan.md](../ship/1-channel-plan.md)
- Set up your own Meta app and connect a Page: [ship/2-meta-setup.md](../ship/2-meta-setup.md)
