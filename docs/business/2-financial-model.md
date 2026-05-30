# Financial model — 36-month projection

Pre-seed financial model for Jobab. All numbers in BDT and USD (1 USD ≈ ৳110).
Conservative assumptions — adjust to your own confidence after pilot data
comes in.

::: tip How to use this
Numbers below are a **starting template**. Copy the tables into Google Sheets
and tweak the assumption cells. The downloadable CSV at the bottom imports
straight into Sheets / Excel.
:::

---

## Assumptions

### Pricing (from the pitch deck)

| Tier    | Monthly      | Annual         | Conversations/mo              |
| ------- | ------------ | -------------- | ----------------------------- |
| Starter | ৳999 ($9)    | ৳9,990 ($90)   | up to 500                     |
| Growth  | ৳2,999 ($27) | ৳29,990 ($272) | up to 2,500 + WhatsApp        |
| Pro     | ৳7,999 ($73) | ৳79,990 ($727) | unlimited + multi-page + team |

**Plan mix:** 60% Starter, 30% Growth, 10% Pro at launch. Shifts toward Growth
(40% Starter, 45% Growth, 15% Pro) by month 24 as merchants outgrow Starter.

**Blended ARPU:**

- Months 1–12: ~৳1,899/mo ($17/mo)
- Months 13–36: ~৳3,099/mo ($28/mo)

### Churn

- Monthly logo churn: 4% (industry norm for SMB SaaS in emerging markets)
- Annual gross retention: ~62%
- Annual net retention: ~85% (upgrades partially offset churn)

### COGS per conversation

| Cost                                          | Amount              |
| --------------------------------------------- | ------------------- |
| Groq tokens (Llama 3.3, ~2k tokens/conv)      | $0.0015             |
| Vision (Llama 4 Scout, ~30% of conversations) | $0.0010             |
| Embeddings (Jina, ~10% of conversations)      | $0.0002             |
| **Total per conversation**                    | **$0.003 (~৳0.33)** |

Average merchant on Growth tier uses ~1,500 conversations/month → **COGS
per merchant ≈ ৳495/mo ($4.5)**. Gross margin on Growth: ~85%.

WhatsApp message templates billed pass-through (cost equals revenue, no
margin) — kept out of unit economics.

### Fixed infrastructure

| Item                                                         | Cost/mo                |
| ------------------------------------------------------------ | ---------------------- |
| Backend hosting (Render Standard)                            | $30                    |
| Postgres + Redis (managed)                                   | $40                    |
| Domain + email + observability (Sentry, Langfuse free tiers) | $0                     |
| Misc (sandbox, CDN, error tracking overage)                  | $30                    |
| **Total**                                                    | **~$100/mo (৳11,000)** |

Scales linearly above 500 merchants — bump to ~$300/mo at 1,000 merchants.

### Hiring plan + salaries (Dhaka rates)

| Role                       | Start month | Monthly cost (BDT) | Monthly cost (USD) |
| -------------------------- | ----------- | ------------------ | ------------------ |
| Founder (you)              | M1          | ৳150,000           | $1,360             |
| Senior full-stack engineer | M4          | ৳200,000           | $1,820             |
| Merchant ops / success     | M6          | ৳80,000            | $730               |
| Fractional CFO (4 hr/week) | M12         | ৳60,000            | $545               |
| Second engineer            | M18         | ৳180,000           | $1,635             |
| BD lead / partnerships     | M24         | ৳120,000           | $1,090             |

(Numbers are gross salary including taxes + benefits, approximate.)

### Other operating costs

| Item                                    | Cost/mo              |
| --------------------------------------- | -------------------- |
| Marketing (FB ads + content + outreach) | $500 → $2,000 by M12 |
| Legal + accounting                      | $200                 |
| Software (Notion, Vercel, etc.)         | $100                 |
| Office (co-working desk × 1–3)          | $200 → $600          |

### Acquisition assumptions

- **CAC:** ৳3,500 ($32) — mix of organic + paid + merchant referrals
- **Activation rate:** 40% of trials → paid by day 14
- **Average merchant lifetime:** 25 months (1 / monthly churn, gross)
- **LTV:** ~৳60,000 ($545) at blended ARPU after M12
- **LTV : CAC** target: 17:1 (very healthy; emerging-market SaaS norm is 5:1+)
- **Payback period:** ~2 months

---

## Growth ramp (paying merchants)

| Quarter                | Months  | Paying merchants (end) | New merchants/mo |
| ---------------------- | ------- | ---------------------- | ---------------- |
| Pre-launch (pilot)     | M1–M3   | 5 (free)               | 0 paying         |
| Post-App-Review launch | M4–M6   | 25                     | 7                |
| EOY1 push              | M7–M12  | 100                    | 13               |
| Y2 scale               | M13–M18 | 250                    | 25               |
| Y2 finish              | M19–M24 | 500                    | 42               |
| Y3 momentum            | M25–M36 | 1,200                  | 58               |

Conservative — assumes only ~50% of trials convert and 4% monthly churn.
Real growth often surprises in either direction once a market is found.

---

## 36-month P&L summary (USD)

| Month | Merchants | MRR     | COGS   | Gross profit | OpEx    | Net (burn) | Cumulative |
| ----- | --------- | ------- | ------ | ------------ | ------- | ---------- | ---------- |
| M3    | 5 (free)  | $0      | $0     | $0           | $2,200  | -$2,200    | -$6,600    |
| M6    | 25        | $425    | $113   | $312         | $4,400  | -$4,088    | -$24,000   |
| M9    | 60        | $1,020  | $270   | $750         | $4,400  | -$3,650    | -$50,000   |
| M12   | 100       | $1,700  | $450   | $1,250       | $5,800  | -$4,550    | -$78,000   |
| M18   | 250       | $7,000  | $1,125 | $5,875       | $8,200  | -$2,325    | -$110,000  |
| M24   | 500       | $14,000 | $2,250 | $11,750      | $10,400 | $1,350     | -$118,000  |
| M30   | 800       | $22,400 | $3,600 | $18,800      | $11,500 | $7,300     | -$95,000   |
| M36   | 1,200     | $33,600 | $5,400 | $28,200      | $13,000 | $15,200    | -$25,000   |

**Cash-flow positive around M24.** Cumulative burn peaks ~$120K — well within
a $400K seed round, with buffer for slower-than-modeled growth.

**ARR trajectory:**

- EOY1: $20K ARR
- EOY2: $168K ARR
- EOY3: $403K ARR

Series-A-ready ($500K–$1M ARR + 100%+ NRR) achievable by M30–M36 if growth
holds.

---

## Use of funds ($400K seed)

| Bucket              | Amount | %   | Notes                                         |
| ------------------- | ------ | --- | --------------------------------------------- |
| Engineering         | $160K  | 40% | 1 senior eng × 18 months, plus founder runway |
| Merchant operations | $100K  | 25% | Hiring + onboarding 100 merchants             |
| Marketing           | $60K   | 15% | Paid acquisition + content + events           |
| Infrastructure      | $60K   | 15% | LLM tokens, hosting, scaling                  |
| Buffer              | $20K   | 5%  | Legal, contingencies                          |

---

## Key metrics dashboard (what to track from M1)

These are the numbers an investor will ask for at every check-in. Track them
weekly.

| Metric                  | Formula                               | M3 target        | M12 target | M24 target |
| ----------------------- | ------------------------------------- | ---------------- | ---------- | ---------- |
| **Paying merchants**    | end-of-month count                    | 0                | 100        | 500        |
| **MRR**                 | sum of monthly subscriptions          | $0               | $1,700     | $14,000    |
| **New merchants added** | per month                             | n/a              | 13         | 42         |
| **Logo churn**          | merchants lost / starting             | <8%              | <5%        | <4%        |
| **CAC**                 | sales+marketing spend / new merchants | n/a              | <$40       | <$35       |
| **LTV**                 | ARPU × gross margin × lifetime months | n/a              | $400       | $545       |
| **LTV : CAC**           | ratio                                 | n/a              | 10:1+      | 15:1+      |
| **Gross margin**        | (revenue – COGS) / revenue            | n/a              | 75%        | 85%        |
| **Burn rate**           | cash out / month                      | -$2K             | -$5K       | break-even |
| **Runway**              | cash / burn rate                      | depends on raise | 18 mo      | infinite   |

---

## Sensitivity analysis

What happens if the model is wrong? Three scenarios.

### 1. Slow growth (50% of plan)

|                 | EOY1  | EOY2   | EOY3    |
| --------------- | ----- | ------ | ------- |
| Merchants       | 50    | 125    | 600     |
| MRR             | $850  | $3,500 | $16,800 |
| Cumulative burn | -$90K | -$175K | -$245K  |

**Action:** Raise extends to 30 months; consider bridge in M24.

### 2. Plan (base case)

|                 | EOY1   | EOY2    | EOY3    |
| --------------- | ------ | ------- | ------- |
| Merchants       | 100    | 500     | 1,200   |
| MRR             | $1,700 | $14,000 | $33,600 |
| Cumulative burn | -$78K  | -$118K  | -$25K   |

**Action:** Raise Series A in M24–M30 at $5M+ pre-money.

### 3. Fast growth (150% of plan)

|                 | EOY1   | EOY2    | EOY3           |
| --------------- | ------ | ------- | -------------- |
| Merchants       | 150    | 750     | 2,000          |
| MRR             | $2,550 | $21,000 | $56,000        |
| Cumulative burn | -$70K  | -$80K   | break-even M22 |

**Action:** Raise Series A in M18 at $10M+ pre-money, expand to Pakistan / Nepal.

---

## Things investors will challenge

| Challenge                                           | Honest response                                                                                                                 |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| "Your CAC assumption is low."                       | Validate during pilot. If real CAC is 3x, raise more or grow slower.                                                            |
| "4% monthly churn is optimistic for SMB."           | True. We bake in 8% in the slow scenario.                                                                                       |
| "ARPU might be lower in BD."                        | Yes — that's why Growth is the target tier, not Pro. Plan mix shifts up over time.                                              |
| "Why ~$400K, not $1M?"                              | $400K gets to break-even with one engineer + one ops hire. $1M would buy faster growth but isn't needed to prove the model.     |
| "Why not transaction fees instead of subscription?" | BD merchants distrust transaction fees (negative anchoring from F-commerce middlemen). Flat SaaS converts better in interviews. |

---

## CSV export

Copy this into a `.csv` file and import to Google Sheets. The first row is
the header; each row is a month.

```csv
month,merchants_paying,new_merchants,churned_merchants,arpu_usd,mrr_usd,cogs_usd,gross_profit_usd,opex_usd,net_usd,cumulative_burn_usd
1,0,0,0,0,0,0,0,1360,-1360,-1360
2,0,0,0,0,0,0,0,1360,-1360,-2720
3,0,0,0,0,0,0,0,2200,-2200,-4920
4,8,8,0,17,136,36,100,4400,-4300,-9220
5,15,7,0,17,255,68,187,4400,-4213,-13433
6,25,11,1,17,425,113,312,4400,-4088,-17521
7,38,14,1,17,646,171,475,4400,-3925,-21446
8,48,11,1,17,816,216,600,4400,-3800,-25246
9,60,13,1,17,1020,270,750,4400,-3650,-28896
10,72,13,1,17,1224,324,900,5800,-4900,-33796
11,86,15,1,17,1462,387,1075,5800,-4725,-38521
12,100,15,1,17,1700,450,1250,5800,-4550,-43071
13,118,19,1,21,2478,635,1843,8200,-6357,-49428
14,138,21,1,21,2898,742,2156,8200,-6044,-55472
15,160,23,1,21,3360,860,2500,8200,-5700,-61172
16,184,25,1,21,3864,989,2875,8200,-5325,-66497
17,210,27,1,21,4410,1129,3281,8200,-4919,-71416
18,250,41,1,28,7000,1125,5875,8200,-2325,-73741
19,290,41,1,28,8120,1305,6815,9300,-2485,-76226
20,335,46,1,28,9380,1508,7872,9300,-1428,-77654
21,380,46,1,28,10640,1710,8930,9300,-370,-78024
22,425,46,1,28,11900,1913,9988,9300,688,-77336
23,460,36,1,28,12880,2070,10810,9300,1510,-75826
24,500,41,1,28,14000,2250,11750,10400,1350,-74476
25,545,46,1,28,15260,2453,12808,11500,1308,-73168
26,605,61,1,28,16940,2723,14218,11500,2718,-70450
27,665,61,1,28,18620,2993,15628,11500,4128,-66322
28,725,61,1,28,20300,3263,17038,11500,5538,-60784
29,775,51,1,28,21700,3488,18213,11500,6713,-54071
30,800,26,1,28,22400,3600,18800,11500,7300,-46771
31,855,56,1,28,23940,3848,20093,13000,7093,-39678
32,915,61,1,28,25620,4117,21503,13000,8503,-31175
33,985,71,1,28,27580,4433,23148,13000,10148,-21027
34,1060,76,1,28,29680,4770,24910,13000,11910,-9117
35,1130,71,1,28,31640,5085,26555,13000,13555,4438
36,1200,71,1,28,33600,5400,28200,13000,15200,19638
```

**Cash-flow positive month 35.** Adjust assumption cells in Sheets to model
your own scenarios.

---

## Next

- [Pitch deck](./1-pitch-deck.md) — the 12-slide outline that uses these numbers
- [Status](../status.md) — current product state for the "traction" slide
- [Channel plan](../ship/1-channel-plan.md) — the launch sequence that drives merchant ramp
