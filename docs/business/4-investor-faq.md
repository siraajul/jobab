# Investor FAQ — rehearsed answers

Every question an investor will ask, with a 30-second answer you can
deliver without thinking. Read this before every meeting. Practice the
ones you stumble on out loud.

::: tip How to use
Cover the right column. Read the left, answer out loud, then check. If
your version was different but better, update this doc.
:::

---

## On the product

**"How does it actually work?"**
Customer sends a DM in Bangla. Our webhook receives it, stores it, queues
a job. A worker process picks up the job, runs an LLM agent loop — looks
up the product, checks stock, drafts a reply, generates a bKash link if
the customer's ready. Reply goes back via Meta's Send API. Whole loop
takes 3-5 seconds. The merchant watches live in a dashboard and can take
over any time.

**"What's the AI model?"**
Llama 3.3 70B for tool calling, via Groq for speed. Llama 4 Scout for
vision (matching customer photos to products). Jina v3 for Bengali
embeddings. Total per-conversation cost: ~$0.003.

**"What if Llama gets expensive or Groq goes away?"**
We have a provider interface — `LlmProvider` in `agent/llm/`. Swapping to
Gemini or another provider is a one-file change. We're not locked in.

**"What's the moat?"**
Three things competitors don't do well: Bangla AI depth (most chatbots
are English-tuned), photo-to-product matching using vision + pgvector
ANN, and live per-conversation cost telemetry merchants can see. The CRM
features (tags, complaints, assignment) are at parity with Lazychat —
that's not where we win.

---

## On the market

**"How big is the market?"**
TAM is about $180M ARR — 500K active F-commerce shops in Bangladesh at a
$30/month blended ARPU. Our serviceable addressable is $30M ARR — the
~50K shops with real DM volume that justifies paying for automation.

**"Why Bangladesh, not India?"**
Bangla AI is harder than Hindi, so most global SaaS skips us. That's our
geographic moat. India is the obvious Phase 2 — Bengali is widely spoken
in West Bengal, the playbook transfers.

**"What about Pakistan, Sri Lanka, Nepal?"**
Same playbook applies. SOM model is conservative — BD only. Regional
expansion is the Series A story.

**"Lazychat raised $1M. Why does the world need another one?"**
They validated demand. They're the proof that BD merchants pay for this.
We're not selling against them on CRM features — we're selling on AI
quality. Different positioning, same buyer.

---

## On the business

**"What's your CAC?"**
Modelled at ৳3,500 ($32). Real number unknown until pilot. If actual CAC
is 3x, we adjust the model and raise more. LTV at our ARPU + churn
assumption is ~$545, so even at 3x CAC we'd still be 5:1 — healthy.

**"4% monthly churn seems optimistic for SMB."**
You're right — that's the base case. Sensitivity model assumes 8% in the
slow scenario; we're still profitable by M30 there. We'll know the real
number 6 months into the pilot.

**"Why subscription and not transaction fees?"**
BD merchants distrust transaction fees — they've been burned by
F-commerce middlemen who take 10-20% per order. Flat SaaS converts much
better in our interviews. Predictable, no surprises, no per-order fight.

**"What's the LTV : CAC?"**
Modelled at 17:1 by M12. Industry healthy is 5:1+. We're conservative
because emerging-market SaaS often surprises positively on retention —
once a merchant integrates, switching costs are real (training, history).

---

## On the funding

**"Why $400K and not $1M?"**
$400K gets us to break-even at M24 with one senior engineer + one ops
hire. $1M would buy faster growth but doesn't prove anything that $400K
can't. We'd rather de-risk the model first and raise a real Series A
once we have $50K MRR.

**"Why $400K and not $200K?"**
$200K gives us 9 months of runway — not enough buffer for Meta App
Review delays + first-pilot iteration. $400K gives 18 months, which
covers the path to break-even with margin.

**"Use of funds?"**
40% engineering (1 senior eng × 18 months + my runway), 25% merchant
operations (hiring + onboarding the first 100), 15% marketing, 15%
infrastructure, 5% legal buffer.

**"What does Series A look like?"**
$3-5M at $15-25M pre, 18 months out, on $500K-$1M ARR + 100%+ net
retention. Use of funds: regional expansion + sales team + WhatsApp
template economy.

---

## On the team

**"Why are you the right person?"**
Built Jobab end-to-end — every line of the codebase is mine. I'm
Bangladeshi, I speak Bangla natively, I've worked with [BD merchant
context]. I know the customer and I can ship the product. The gaps —
sales, ops, finance — are obvious; they're my first hires.

**"You're solo. What if you get hit by a bus?"**
Reasonable concern. First eng hire in M4 reduces bus-factor to two. All
infra is documented, every API is on Swagger, the codebase has a book
explaining every pattern. I'm not the bottleneck for any feature longer
than a month.

**"How are you going to learn sales?"**
I won't, beyond the first 5 merchants. The ops/success hire in M6 is the
designated relationship person. I'm the founder doing 30-second sales
calls; they do the 30-day onboarding.

---

## On the platform risk

**"Meta could change the rules."**
They already do — message tags were killed in Feb 2026, which forced us
to make WhatsApp Phase 2 instead of Phase 3. We follow Meta's
changelog, we have a 24-hour-window guard in code, and we ship features
that don't depend on policy edge cases. The core product (in-window AI
replies) is rock-solid Meta-supported behaviour.

**"What if Meta bans the AI?"**
Meta requires bot disclosure, which we do. They explicitly allow AI
replies as long as they're not pretending to be human. As long as the
merchant can take over (which they always can), we're inside policy.

**"What if Facebook dies in BD?"**
Unlikely in the next 5 years — F-commerce is too entrenched. But the
same agent loop works on WhatsApp, Instagram, and (eventually) Telegram.
We're a multi-channel product, not a Facebook product.

---

## On the technical risk

**"Why TypeScript everywhere?"**
One language across backend, frontend, mobile, shared types. Eliminates
schema-drift bugs. Refactoring is safe. Hiring is easier — full-stack
TS devs are plentiful in Dhaka.

**"Why your own infra instead of, say, Vercel for everything?"**
We have a worker process (BullMQ consumer) that can't run on Vercel —
needs a long-running Node process. Render or Fly handles both API +
worker easily. Vercel for the Next.js dashboard.

**"You're using pgvector instead of Pinecone. Why?"**
One database to operate, one backup, one auth. Pinecone is faster at
billion-vector scale; we're at thousand-vector scale and will be for
years. pgvector is plenty fast and free.

---

## On exits

**"What's the exit?"**
Most likely: acquisition by Pathao, Daraz, or bKash — companies that
want a merchant SaaS layer. Less likely but possible: regional roll-up
by Sea Group / Shopee / Tokopedia. Smallest probability: IPO 10 years
out.

**"Comparable exits?"**
Lazychat is still private; the regional exits are messenger.io ($25M
Conversocial acquisition by Microsoft) and Octane.ai ($30M+ exits to
larger e-commerce platforms). Our exit target is $50-100M in 5-7 years.

---

## When you don't know

If they ask something you can't answer, say:

> "Good question — I don't have a great answer right now. Let me come
> back to you in 24 hours with real data."

Then actually do it. Investors respect honest "I'll get back to you"
more than fabricated confidence.

---

## Next

- [Pitch deck](./1-pitch-deck.md) — the slides
- [One-pager](./3-one-pager.md) — the email teaser
- [Demo script](./5-demo-script.md) — the 10-min live walkthrough
