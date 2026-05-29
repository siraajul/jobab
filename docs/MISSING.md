# What's Missing — Honest Inventory

_Last updated: 2026-05-30_

Grouped by **when it'll bite us**, not by category. Each line tells you who
owns the fix and a rough effort estimate so you can prioritise. Things marked
**"You"** are decisions or external accounts only you can handle; **"Me"** is
engineering work; **"Lawyer"** is what it says.

The single biggest gap is not on this list. **It's the missing merchant.** Until
a real Dhaka shopkeeper has used Jobab for a week, every item below is
prioritised by guess.

---

## 🔴 Blocks the pilot starting

| Gap | Owner | Effort |
|---|---|---|
| Meta Business Verification submitted | You | 2–6 week clock — start tonight |
| Public HTTPS URL for the webhook (ngrok in dev, deploy in prod) | You | 5 min for ngrok |
| Privacy policy hosted at a real URL (markdown already drafted at `docs/legal/privacy-policy.md`) | You + hosting | 1 hour |
| First real merchant scheduled | You | 1 week of outreach |

Three of four are non-engineering. The engineering side is *done* for pilot-start
purposes.

---

## 🟡 Will surface in pilot weeks 1–4

These get **real-merchant feedback only** — engineer them only if the pilot
reveals they matter. Don't pre-build.

| Gap | Why it'll come up | Effort |
|---|---|---|
| Forgot-password flow | Someone forgets within week 1 | Me · 2 hours |
| Email verification on sign-up | Currently any "@" passes | Me · 2 hours |
| Email service (Resend / Postmark) for invites + password resets | Tokens-via-WhatsApp works for v0 | Me · 3 hours |
| Conversation **assignee picker** in the inbox UI | Backend supports it; no UI dropdown | Me · 1 hour |
| Customer-facing **AI disclosure** toggle | First time a customer realises they're talking to AI | Me · 1 hour |
| **Bulk actions** (multi-select, bulk-takeover, mark-all-read) | When a merchant has 50 DMs queued | Me · half day |
| **Full-text search** across message content | Current search is name-only | Me · 3 hours |
| **Daily WhatsApp summary** ("Jobab handled 47 today, ৳12k revenue") | Without it merchants underestimate value delivered | Me · half day |
| **AI-off scheduling** ("pause AI 11pm–7am") | Some merchants will want strict hours | Me · half day |
| **Catalog editing in UI** (single-product add/edit, stock adjust) | Currently CSV-only — frustrating for one-off changes | Me · 1 day |
| **Order line-item editing** post-creation | "I forgot to add a dupatta" | Me · half day |
| **Refund / partial refund** flow | First real complaint comes, no UI to resolve cleanly | Me · 1 day |
| **Date-range filtering** in analytics + orders | "Show me last week" — common ask | Me · 3 hours |
| **CSV export** of orders / messages | For their accountant | Me · 2 hours |

---

## 🟠 Production launch blockers (before public sign-up)

Eventual must-haves. Pilot works without them.

| Gap | Owner | Effort |
|---|---|---|
| Meta App Review approved | You | Weeks of process |
| Real bKash merchant account | You | Business onboarding |
| **Stripe** (or equivalent) for our billing | You + Me | 1–2 days |
| Pricing tiers + paywall + usage caps | Product + Me | 3–5 days |
| Trial mode with auto-expiry | Me | 1 day |
| Per-org LLM cost caps (so a runaway customer can't drain margin) | Me | half day |
| MFA / SSO (replace dev auth with Clerk / Supabase) | Me + You (account) | 1 day |
| Real Sentry + Langfuse keys in production | You (signup) | 10 min once accounts exist |
| Terms of service + DPA | Lawyer | 1–2 weeks |
| Cookie consent banner (if any EU traffic) | Me | 2 hours |
| Data Processing Agreement template for design partners | Lawyer | 1 week |
| Production hosting (Railway / Render / Vercel / Fly) | You | 1 day |
| Database backup + point-in-time recovery | You (hosting choice) | depends |

---

## 🔵 Phase 2 / scale items (don't build yet)

| Gap | Why deferred |
|---|---|
| Real Jina API key + visual ANN active | Image match works as describe-then-search; upgrade when volume justifies cost |
| Multi-page UI (org with multiple FB Pages) | Schema supports it; no merchant needs it in pilot |
| Mobile image-attachment composer | Read-only mobile is enough for pilot |
| Mobile push delivery tested on a real device | Code is wired; needs Expo / EAS run |
| Mobile app icons + splash + EAS build setup | Pre-launch polish |
| Voice messages | Out of MVP scope |
| Reports / exports + per-product analytics | "What's selling?" — useful, not load-bearing |
| Customer / CRM view ("all of Tahmina's history") | Power feature; not pilot-critical |
| Tags / labels / notes on conversations | Power feature |
| Webhook-subscription management UI for multi-Page orgs | Phase 2 §11 follow-on |
| Comments-page rule preview / sandbox | Currently merchant must PATCH and watch |

---

## 🎨 UI polish still on the to-do list

| Gap | Effort |
|---|---|
| **Lucide icons everywhere** (replace hand-drawn SVGs) | 1 hour — massive cohesion win |
| **Type + spacing scale locked** in `tailwind.config.ts` | half day |
| **Per-screen empty-state illustrations** (no longer one shared recipe) | 1 day with a designer |
| Port the inbox hero treatment to every page via `AppShell` | 2 hours |
| Compact list view for `/orders` when ≥20 orders | half day |
| **Storybook** so a designer can iterate without an engineer | 1 day |
| Favicon, PWA manifest, OpenGraph card, login background pattern | 2 hours + designer for assets |
| 404 illustration instead of text-only | 30 min + asset |

---

## 🧪 Engineering rigor we haven't shipped

| Gap | Note |
|---|---|
| **Web unit tests** | 0 today. Vitest + Testing Library — 1–2 days for inbox + auth coverage |
| **Mobile tests** | 0. Same Vitest setup |
| **E2E tests** (Playwright) | 1 day for the critical paths (sign-up → first AI reply, order → mark paid) |
| **Integration tests** against a real Postgres in CI | Schema is in CI already; just write the supertest cases |
| **Performance budgets** | Lighthouse not run; bundle size not measured |
| **Index tuning** | Sensible indexes exist; no production-query analysis yet |
| **Accessibility audit** (axe + manual screen-reader pass) | Not done |
| **Backend deploy step in CI** | Workflow runs lint / typecheck / test; no deploy stage |
| **Real production Dockerfile run** | Multi-stage Dockerfiles exist; never run in prod context |
| **Audit-event retention policy** | Currently keeps forever |
| **Encryption-key rotation runbook** | Conceptual; no procedure documented |

---

## 💰 Things only you can decide

These aren't engineering gaps — they're product/business decisions outstanding.

1. **Pricing model.** 1% GMV? Flat $25/mo? Per-conversation? Decide before pilot week 3.
2. **Free trial length.** 14 days? 30? Forever-free with a usage cap?
3. **Company legal entity.** Where, what structure, who owns what.
4. **Domain name.** `jobab.com`? Something else?
5. **Brand mark.** Jamdani motif is good; want a real logo lock-up from a designer?
6. **Founding team structure.** Solo? co-founders?
7. **Investor strategy.** Bootstrap? Pre-seed? Grants from BD ecosystem (LightCastle, Startup Bangladesh)?
8. **Geographic scope.** Dhaka first, then where?
9. **Vertical scope.** Clothing only (current bias)? Food? Cosmetics? Phones?
10. **AI disclosure policy.** Default on/off + the exact phrasing.
11. **Privacy policy + DPA reviewed** by a lawyer in your jurisdiction.
12. **Meta Business Verification doc package** assembled (we have the kit; need the legal-entity papers).

---

## 📊 Where we are vs. where the next bottleneck is

| Stage | Status |
|---|---|
| Engineering — Phase 1 | ✅ done |
| Engineering — Phase 2 | ✅ done |
| Engineering — UX polish from the review | ✅ shipped |
| Pilot prep — docs + eval kit | ✅ done |
| Pilot prep — Meta App Review materials | ✅ docs done · ❌ not submitted |
| First real merchant signed up | ❌ zero |
| First real customer DM served | ❌ zero (only fake-webhook traffic) |
| Bangla quality at production grade | ❌ unknown without eval data |
| Pricing decided | ❌ |
| Billing infrastructure | ❌ |
| Public launch | 🚧 6–12 weeks away minimum |

---

## My recommendation (PM hat)

Stop adding features. The pile of code is now **larger than the pile of
evidence that anyone wants it**. The cheapest, fastest, most informative thing
this week:

1. **Today** — submit Meta Business Verification.
2. **Today** — `ngrok http 3000`, paste the URL into the Meta App webhook + data-deletion config.
3. **Today** — cold-DM 8 candidate merchants from `docs/pilot/pilot-outreach.md`.
4. **This week** — do 5 real merchant interviews. Don't pitch — listen ([docs/pilot/interview-script.md](./pilot/interview-script.md)).
5. **Next week** — install Jobab on one real merchant's Page. Watch it for 4 weeks.

Everything in the lists above gets re-prioritised by what merchants actually
surface during those 4 weeks. Anything we'd build today without that signal is
guessing — well-engineered guessing, but still guessing.

---

## How to use this file

- Re-read at the start of every planning session.
- Move items between sections as priorities shift (pilot data should cause
  big movements).
- Anything that gets done → strike it through, leave the line, add a date.
  That history becomes the project diary.
- Add new lines as you discover them. The list is a living thing.
