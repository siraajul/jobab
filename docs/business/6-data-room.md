# Data room checklist

What to have ready when an investor says "this looks promising — can you
send us your data room?"

::: tip When to share
**Only after a verbal "we're interested in moving forward."** Don't send
the data room with the cold email. It's a sign of seriousness on both
sides — sharing it should mean the investor is committing time.
:::

---

## How to host it

Pick one:

- **Google Drive folder** (easiest, free, easy to control access per-investor)
- **Notion page** (better for narrative docs + comments)
- **DocSend** (paid, tracks who viewed which doc and for how long — useful for prioritising follow-ups)

For pre-seed: Google Drive is fine. Switch to DocSend at Series A.

---

## What goes in the data room

### 1. Pitch materials

```
📁 1. Pitch materials/
  ├── jobab-pitch-deck.pdf
  ├── jobab-one-pager.pdf
  ├── jobab-demo-video.mp4 (or Loom link)
  └── jobab-financial-model.xlsx
```

### 2. The product

```
📁 2. Product/
  ├── product-screenshots/        (Inbox, Orders, Catalog, Analytics, Settings)
  ├── architecture-overview.pdf   (export of ARCHITECTURE.md)
  ├── tech-stack-overview.pdf     (export of docs/build/3-tech-stack.md)
  └── live-docs-url.txt           (siraajul.github.io/jobab)
```

Investor questions this answers:

- "Show me the product" → screenshots + Loom
- "Is the tech real?" → architecture + tech-stack + repo URL

### 3. Market evidence

```
📁 3. Market/
  ├── merchant-interviews/        (anonymised notes from 5+ BD merchant conversations)
  ├── competitive-landscape.pdf   (Lazychat, Manychat, others — feature comparison)
  ├── market-size-sources.pdf     (BB fintech report, F-commerce Alliance data)
  └── meta-channel-research.pdf   (the Meta-rules-2026 research we did)
```

Investor questions:

- "How do you know merchants want this?" → interviews
- "Why won't Lazychat eat your lunch?" → competitive landscape
- "Where do your TAM numbers come from?" → sources

### 4. Traction

```
📁 4. Traction/
  ├── pilot-merchants-list.pdf    (names, page URLs, signup dates, status)
  ├── usage-metrics.pdf           (active merchants, conversations/day, AI-handled %)
  ├── meta-business-verification.pdf  (status, dates)
  └── app-review-submission.pdf   (status, submitted/approved permissions)
```

Update this folder **monthly** — investors will check the date on the
files. Stale traction data signals you're not paying attention.

### 5. Financials

```
📁 5. Financials/
  ├── financial-model.xlsx        (the 36-month projection)
  ├── current-burn.pdf            (last 3 months: cash in, cash out, runway)
  ├── pricing-research.pdf        (how we landed on ৳999/৳2,999/৳7,999)
  └── unit-economics.pdf          (COGS per conversation, LTV/CAC math)
```

### 6. Legal + company

```
📁 6. Legal/
  ├── incorporation-certificate.pdf
  ├── trade-license.pdf
  ├── tax-registration.pdf
  ├── cap-table.xlsx              (founder + any prior investors / ESOP)
  ├── ip-ownership-statement.pdf  (you own the code, no employer IP issues)
  └── contracts/
      ├── meta-developer-tos.pdf
      ├── groq-api-tos.pdf
      └── (any merchant LOIs)
```

### 7. Team

```
📁 7. Team/
  ├── founder-bio.pdf             (your 1-page bio)
  ├── founder-linkedin.pdf        (your LinkedIn export)
  ├── hiring-plan.pdf             (first 5 hires + when + why)
  └── advisor-list.pdf            (if you have advisors — names, what they help with)
```

### 8. References

```
📁 8. References/
  ├── customer-references.pdf     (pilot merchants willing to take a call)
  ├── investor-references.pdf     (any prior backers, even friends-and-family)
  └── advisor-references.pdf
```

Pre-seed, this section may be thin. That's normal. Honesty: "We're early,
the pilot merchants will be the first references."

---

## What NOT to put in the data room

- Half-baked drafts ("v2 of pricing — TBD")
- Internal Slack screenshots
- Anything you wouldn't want a competitor to see (this stuff sometimes leaks)
- Negative-toned docs ("things we got wrong" — discuss verbally instead)
- Personal data of merchants — anonymise interview notes

---

## Access tiers

Different investors get different folders.

| Stage                         | What they see                      |
| ----------------------------- | ---------------------------------- |
| Cold email                    | One-pager only                     |
| First meeting confirmed       | Deck + Loom                        |
| Verbal interest after meeting | + Financial model, market research |
| Considering term sheet        | + Legal, cap table, references     |
| Term sheet signed             | Full data room                     |

Use Google Drive's per-folder sharing, or DocSend's per-investor links,
to control this.

---

## Tracking who's seen what

Maintain a simple spreadsheet:

| Investor      | Stage         | Last contact | Last doc sent   | Next step         |
| ------------- | ------------- | ------------ | --------------- | ----------------- |
| [Name @ Fund] | Cold          | 2026-06-01   | One-pager       | Follow up Friday  |
| [Name @ Fund] | First meeting | 2026-06-03   | Deck + Loom     | Demo next Tuesday |
| [Name @ Fund] | Considering   | 2026-06-10   | Financial model | Send refs         |

Without this, you'll forget who's seen what and double-send things or
lose investors in the cracks.

---

## What to send when

| Trigger                           | What to send                                                           |
| --------------------------------- | ---------------------------------------------------------------------- |
| Cold outreach                     | One-pager PDF in the email body                                        |
| Investor replies "interested"     | Calendly link + deck PDF                                               |
| After meeting (within 4 hours)    | Follow-up email with deck + Loom + specific answers to their questions |
| After "we want to move forward"   | Data room link (filtered to their tier)                                |
| Monthly update (active investors) | One-pager "what changed this month" — even before they ask             |

---

## Monthly investor update template

For investors who have engaged but not yet committed. Keep them warm.

```
Subject: Jobab update — [Month] [Year]

Hi [Name],

Quick update on Jobab since we last spoke:

PRODUCT
  • [3 most important shipped things]

TRACTION
  • [N] paying merchants ([N] last month) — [delta]
  • $[X] MRR ([X] last month)
  • [N] merchant interviews / pilot signups

FUNDRAISING
  • [Where we are in the round, e.g. "Raised $200K of $400K target"]

NEXT MONTH
  • [3 things you'll ship or do]

ASKS
  • [Specific intros or help you need — never just "anything!"]

[Your name]
```

Send the first Monday of every month. Keep it short. Investors who get
regular updates from founders are 3x more likely to invest later, even
if they passed initially.

---

## Next

- [Pitch deck](./1-pitch-deck.md)
- [One-pager](./3-one-pager.md)
- [Investor FAQ](./4-investor-faq.md)
- [Demo script](./5-demo-script.md)
