# Pilot — 4-Week Plan

## Week 0: recruit + interview

- **Mon-Wed**: 8 outreach DMs / day to candidate merchants. Personal voice
  notes work better than text in BD. Target: 8 interviews scheduled.
- **Thu-Fri**: run the 45-min interviews ([script](./interview-script.md)).
- **Weekend**: from the 8, pick 3 best-fit. Email the consent form.

**Success gate**: 3 merchants signed; one paragraph of pain captured from
each; they agree to a 90-min onsite setup.

## Week 1: onboarding + first AI replies

- **Day 1 (onsite)**: 90 min at merchant's home/shop. Connect Page,
  upload product CSV, draft AI instructions in *their* voice (record them
  describing what they normally say), enable Jobab.
- **Day 2-3**: AI is in "shadow mode" — replies are queued but not sent.
  Merchant reviews and edits. The team manually fixes anything the AI
  got wrong; each fix is one new entry in the eval set.
- **Day 4-5**: enable real auto-reply for `bot` status during business
  hours only. Keep night auto-off until week 2.

**Daily**: 15-min WhatsApp check-in with the merchant. Just "any
problem? hou or na?". Log every complaint to a doc.

**Eval set goal**: 30 cases collected from real customer DMs by end of week.

## Week 2: full auto + edge cases

- Enable 24h auto-reply.
- Watch for the obvious failure modes: wrong stock, wrong price, fabricated
  address, complaint mis-routing.
- Each failure becomes (a) a fix, (b) a new eval case, (c) a system-prompt
  tweak if pattern emerges.

**Tooling**:
- Daily Langfuse trace review: 10 random traces / merchant
- Weekly model A/B: if we change the system prompt, run the eval set
  before/after; deploy only if score doesn't drop

**Eval set goal**: 80 cases by end of week.

## Week 3: pricing experiment

- Soft-ask the willingness-to-pay numbers from the interview.
  "Apa, jodi eta ekhon free na hoye, koto money apni pay korten?"
- Mid-week: announce the price ("week 5 theke ৳X/month") and offer a
  founding-merchant discount.
- Watch reactions. If they all push back at the same price point, that's
  the line.

## Week 4: decision

- Run the full eval set on the latest model + prompt.
- Calculate per-merchant metrics:
  - AI autonomy ratio
  - Orders / week
  - Avg latency, p95 latency, total cost
  - Self-reported "hours saved"
- Decide: green-light a public beta launch, iterate another 4 weeks with
  the same merchants, or kill the wedge.

---

## What we instrument from day 1

Already in place:
- `agent_runs` — every LLM call with tokens, cost, latency, tool calls
- `audit_events` — every state change
- `orders` — outcome data

Add for pilot:
- A `pilot_event` table with `merchantId, type, payload, createdAt` for
  qualitative things: "merchant edited AI reply", "merchant marked AI
  reply as wrong", "merchant took over manually mid-conversation"
- A daily roll-up email to the engineering team: per-merchant metrics +
  the worst 3 traces of the day

## What we explicitly DON'T do during the pilot

- New features. Only bug fixes.
- Onboarding flow polish for merchants not in the pilot. The 3 we have
  are who we serve.
- Mobile app investment. Web is enough.
- Pricing infrastructure. Hand-collect payment via bKash in week 4-5.

The discipline of "no new features" is more important than any individual
feature. Resist it.
