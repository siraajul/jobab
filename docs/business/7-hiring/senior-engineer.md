# Senior Full-Stack Engineer — Jobab

**Location:** Dhaka, Bangladesh (in-person or hybrid)
**Type:** Full-time
**Compensation:** ৳200,000–280,000/month + meaningful ESOP
**Start:** As soon as we close seed funding

---

## About Jobab

Jobab is an AI shop assistant that lets Bangladeshi merchants run their
Facebook / Instagram / WhatsApp businesses without drowning in DMs. The
AI replies in Bangla, recognises products from photos, takes orders,
generates bKash links, and hands off to a human when needed.

The product is built and documented. We're hiring our first engineer
to scale it from 5 pilot merchants to 500+ paying customers in 18 months.

Live docs: [siraajul.github.io/jobab](https://siraajul.github.io/jobab)
Repo: [github.com/siraajul/jobab](https://github.com/siraajul/jobab)

---

## Why this role is interesting

- **You'll be employee #1.** Real ownership. Real say in the architecture
  decisions you'll live with for years.
- **The product is real, not vapourware.** You won't spend month 1
  arguing about what to build — there's already a working AI agent
  loop, real merchants in pilot, and a clear feature roadmap.
- **TypeScript everywhere.** Backend (NestJS), frontend (Next.js), mobile
  (Expo), shared types (Zod). One language to be expert in.
- **You'll work directly with the founder.** No politics, no five-layer
  product review cycles. Daily standups in Bangla or English.
- **Meaningful ESOP.** Pre-seed equity matters. The earlier you join,
  the more you own.

---

## What you'll work on

In your first 90 days:

1. Build the **WhatsApp Cloud API integration** — webhook receiver,
   template registry, embedded signup flow. (Roadmap: `docs/ship/1-channel-plan.md`)
2. Ship the **Contact model** — promote ephemeral customer fields off
   `Conversation` into a real entity with cross-conversation history.
3. Wire **production observability** — Sentry + Langfuse with proper
   alerting on agent failures.

After that: payments + billing infrastructure, mobile app feature work,
performance work as we scale, helping interview the next 2 hires.

---

## Who we're looking for

You probably have:

- **4+ years building production web applications** in any modern stack
  (Node/TypeScript a plus, but Python/Go/Java backgrounds work)
- **Strong TypeScript fundamentals** — generics, discriminated unions,
  the difference between `unknown` and `any`
- **Experience with at least one of** NestJS, Next.js, Prisma, Redis-backed
  queues, vector databases — we use all of these
- **Worked on a product where you owned the full stack** end-to-end
  (database → API → UI)
- **Can read someone else's code without losing patience** — you'll
  inherit a clean but opinionated codebase

You'd be a great fit if you also:

- Speak Bangla natively (most merchant conversations are in Bangla)
- Have worked at a startup before — you know what 0→1 feels like
- Have shipped something with an LLM in production (Groq, OpenAI,
  Gemini, Anthropic, whatever)
- Understand why we use pgvector instead of Pinecone
- Have opinions about commit messages and PR descriptions

You don't need:

- A CS degree
- AI/ML research background — we use LLMs as APIs, not as training projects
- React Native experience — we'll figure mobile out together

---

## Tech stack you'll use day-to-day

NestJS · TypeScript · Prisma · PostgreSQL + pgvector · Redis + BullMQ ·
Next.js 14 · React · Tailwind · Zod · Groq (Llama 3.3 + Llama 4 Scout) ·
Jina embeddings · Meta Graph API · pnpm workspaces · Jest · GitHub Actions

Full deep-dive: [docs/build/3-tech-stack.md](../../build/3-tech-stack.md)

Reading these will tell you if you'd enjoy the codebase:

- [ARCHITECTURE.md](https://github.com/siraajul/jobab/blob/main/ARCHITECTURE.md)
- [docs/build/3-tech-stack.md](../../build/3-tech-stack.md)
- [Agent loop in code](https://github.com/siraajul/jobab/tree/main/apps/backend/src/agent)

---

## What we offer

- **Salary:** ৳200,000–280,000/month based on experience
- **Equity:** 0.5–1.5% ESOP, 4-year vest, 1-year cliff
- **Workplace:** Remote-friendly, Dhaka office for in-person days
- **Equipment:** New MacBook + monitor
- **Health insurance** for you (family option from year 2)
- **Learning budget:** ৳50,000/year for books, courses, conferences
- **Flexible hours** — we care about output, not seat time

---

## How to apply

Email **hiring@jobab.com** with:

1. A short paragraph (4-6 sentences) on why this role interests you
2. Your GitHub or GitLab handle (mandatory — code speaks louder than CV)
3. A link to **one thing you've built** that you're proud of, plus a
   sentence on what you'd do differently if you rebuilt it now
4. Optional: a CV / LinkedIn

No cover letter padding. We read every application.

## Hiring process

1. **Application review** — 3-5 business days
2. **30-min intro call** with the founder
3. **Take-home** — 2-4 hours, paid (৳3,000). A small feature in our actual
   codebase, your choice from a list of 3.
4. **2-hour pairing session** — we walk through your take-home together
   and pair on a follow-up change
5. **Reference check + offer** — 1 week

Total timeline: ~3 weeks from application to offer.

---

## Equal opportunity

We hire on craft and judgement, not gender, background, age, or which
university you attended. If our process or these terms accidentally
exclude you, please email and tell us — we'll fix it.
