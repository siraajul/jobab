# Demo script — 10-minute live walkthrough

The demo is when the investor decides whether you're real. Practice this
until you can do it in your sleep.

::: tip Before the meeting

- Open every tab you'll need in advance
- Test the ngrok tunnel — last thing you want is a dead URL mid-demo
- Have a backup: pre-recorded Loom in case anything breaks
- Put your phone face up on the desk, page open to your test Facebook page
  :::

---

## Setup (do this 10 minutes before)

| Tab | URL                                                  | Why                                 |
| --- | ---------------------------------------------------- | ----------------------------------- |
| 1   | `localhost:3001/inbox` (or prod URL)                 | The dashboard                       |
| 2   | Your phone, Messenger app, on the test page          | The customer side                   |
| 3   | `localhost:3000/docs` (or prod)                      | Swagger — if they ask about the API |
| 4   | `siraajul.github.io/jobab/start-here/2-how-it-works` | If they want depth on the AI loop   |
| 5   | Pitch deck (slide 1)                                 | Fallback if demo dies               |

Make sure the seeded catalog has at least one "lal jamdani shari" — the
example DM only works if the product exists.

---

## The 10-minute script

### Minute 0–1 — Set the stage

> "I'm going to show you Jobab from two sides — the customer's phone and
> the merchant's dashboard. Watch what happens when a customer asks about
> a product in Bangla."

Don't apologise, don't preface, don't explain features yet. Just go.

### Minute 1–3 — The customer side

Pick up your phone. Open Messenger to your test page. Type:

> "lal jamdani shari ache? medium lagbe"

(Banglish — Bangla written in English letters. The most common form of
customer DM.)

Within 3 seconds, the AI replies:

> "জি আপু, আছে! ১২৫০ টাকা। আপনার ঠিকানাটা পাঠাবেন?"

**What to say while it's happening:**

> "That's Llama 3.3 — 70B parameters, but running on Groq it answers in
> under 3 seconds. It searched our catalog, found the product, replied in
> Bangla in the customer's own register."

### Minute 3–5 — The merchant side

Switch to the dashboard. The conversation is already there, updating live.

Click into it. Show:

1. **The conversation thread** — customer's message, AI reply, both timestamped
2. **The right rail** — customer details (auto-captured), live order (assembling as the AI talks to the customer)
3. **The Activity panel** — every tool call the AI made, tokens consumed, cost in ৳ and $

> "The merchant sees this in real time. They didn't have to do anything —
> the AI is handling the sale. But they can take over any time."

Click "Take over." Show the AI go quiet. Type a manual reply:

> "Hi! আপনার অর্ডার এর জন্য ধন্যবাদ। আমি confirm করছি।"

Send. Show the message appears, the AI doesn't respond. Click "Hand back."

> "When the merchant hands back, the AI picks up the next message and
> keeps selling."

### Minute 5–7 — The hard cases

Show the photo flow. From your phone, send a photo of a saree.

> "Customers send photos constantly — 'do you have this?' The AI uses a
> vision model to describe the image, then searches our catalog using
> embeddings. If it's confident, it talks about the product. If not, it
> shows the merchant top candidates and asks 'which one?'"

Wait for the AI response, show the matched candidate cards in the inbox.

Then show the handoff. Send a complaint DM:

> "ami last week order korsi, eta wrong color hoise"

Watch the AI hand off:

> "When the customer reports a problem — complaint, refund, payment
> dispute — the AI stops and pings the merchant. No bad customer
> experience, no awkward robot apologies."

Show the "Needs you" filter in the inbox lighting up. Show the
handoff banner in the conversation with the reason.

### Minute 7–9 — The merchant's command center

Quick tour of the other screens (don't dwell):

1. **Orders** — lifecycle (created → confirmed → shipped → delivered),
   bKash status, printable invoice. _"Every order the AI took shows up here."_
2. **Catalog** — products + variants, sync from CSV / Shopify / Woo.
   _"Once it's here, the AI can talk about it."_
3. **Analytics** — AI-handled vs merchant-handled conversations, revenue,
   token cost, response time. _"The merchant always knows what the AI is costing them and what it's earning them."_
4. **Settings** — AI voice instructions, catalog source, team members,
   invite agents.

Don't open Comments, Onboarding, or anything else. Stay focused.

### Minute 9–10 — Wrap

Back to the inbox. One sentence each:

> "That was the whole product. Inbox, orders, catalog, AI, analytics — all
> built. What's left is paperwork: Meta App Review, bKash production
> credentials, and getting the first 10 merchants onboarded. The
> technology is the easy part; the merchant relationships are the hard
> part."

Stop talking. Let them ask the next question.

---

## What to do when something breaks

### The AI doesn't reply

Quick recover:

> "Worker might be cold-starting — let me try once more."

Wait 5 seconds. If still nothing, switch to the Loom backup:

> "Let me show you the recorded version — sometimes the live demo gets
> finicky over ngrok."

Don't apologise more than once. Move on.

### Facebook returns an error

> "Looks like a Meta sandbox quirk. The recorded demo shows the same flow
> with a real merchant page — let me play that."

### The dashboard doesn't load

Refresh once. If still broken:

> "Local dev is being weird. Let me share my screen with the production
> URL instead."

(Have prod ready — even if it's behind a password.)

---

## What investors typically ask during/after the demo

| What they ask                      | Real answer                                                                                                               |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| "How long did this take to build?" | [N] months solo. Be honest.                                                                                               |
| "Is this all one codebase?"        | Yes — TypeScript monorepo, ~25 backend modules, ~10 dashboard routes.                                                     |
| "How many APIs are you calling?"   | Meta (Facebook + Instagram), Groq (LLM + vision), Jina (embeddings), bKash (payment), Postgres (pgvector), Redis (queue). |
| "What's the latency end-to-end?"   | 3–5 seconds for a typical conversation. The vision flow is ~6 seconds.                                                    |
| "Can I try it?"                    | Yes — give them a tester slot on your dev-mode Meta app.                                                                  |
| "Do you have it deployed?"         | Show the docs site at siraajul.github.io/jobab. If prod is live, send the URL after the meeting.                          |

---

## Demo do's and don'ts

| Do                                                  | Don't                                           |
| --------------------------------------------------- | ----------------------------------------------- |
| Show, don't tell.                                   | Talk over the AI thinking.                      |
| Use the customer's actual language ("lal jamdani")  | Translate to English mid-demo                   |
| Let the AI reply finish before you keep talking     | Cut it off                                      |
| Have a real catalog seeded                          | Demo with placeholder "Product 1" / "Product 2" |
| Use a real (test) BD phone number for WhatsApp demo | Use +1 555 numbers                              |
| Show the cost telemetry                             | Hide it                                         |
| End on time                                         | Let it drag to 15 min                           |

---

## After the demo — the follow-up email

Send within 4 hours of the meeting:

```
Subject: Jobab — follow-up + materials

Hi [Name],

Thanks for the time today. As promised:

  • Deck PDF: [link]
  • One-pager: [link]
  • Demo video (3 min): [Loom link]
  • Live docs: siraajul.github.io/jobab
  • Repo: github.com/siraajul/jobab

On the [specific question they asked]: [your follow-up answer with
a number or a link].

Happy to set up a follow-up to dig into anything specific. Let me
know.

Best,
[Your name]
```

The "[specific question they asked]" line is the most important part.
Shows you were listening, not just pitching.

---

## Next

- [Pitch deck](./1-pitch-deck.md) — what you show before the demo
- [Investor FAQ](./4-investor-faq.md) — rehearsed answers for the Q&A
- [One-pager](./3-one-pager.md) — the teaser that gets you the meeting
