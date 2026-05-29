# Privacy Policy — Jobab

*Last updated: [date]*

**This is a working draft. Have a lawyer in the destination jurisdiction
review before you publish it publicly. Bangladesh's Digital Security Act,
the upcoming Personal Data Protection Act, plus Meta's Platform Terms all
apply.*

## Who we are

Jobab ("we", "us") is an AI sales assistant for social-commerce merchants.
Merchants connect their Facebook Page to Jobab; we read the messages their
customers send them and reply on their behalf.

Operator: [Your legal entity, address, contact email]
Data Protection contact: privacy@jobab.com

## What data we collect

### From the merchant (our customer)
- Account: name, email, password hash
- Business profile: shop name, AI instructions, catalog products + variants
- Connected Facebook Page identifiers and access tokens (encrypted at rest
  with AES-256-GCM)
- Billing details (if applicable; processed by our payment provider)

### From the merchant's customers (your end users, NOT our customers)
- The Messenger PSID (a per-page-per-user opaque id Meta provides)
- Message contents the customer sends to the merchant's Page
- Image attachments the customer sends, by URL (we do not re-host them)
- Customer-provided contact info the customer types into the chat (name,
  phone, address) when placing an order
- Comments the customer leaves on Page posts/ads if the merchant has
  comment automation on

## What we do with it

We use the data to:
- Reply to the customer on the merchant's behalf using AI models
- Recognise the product the customer is asking about
- Build the order and generate a payment link
- Notify the merchant when their attention is needed
- Improve the AI quality through anonymised eval sets (see below)

We do **not** sell, rent, or share any of this data with advertisers,
brokers, or third parties, except the strictly necessary AI providers
listed below.

## Where the data goes

Operational sub-processors:
- **Groq** (LLM inference) — receives anonymised conversation context to
  generate replies. https://groq.com/privacy
- **Jina AI** (embeddings) — receives product titles + descriptions and
  image URLs, returns vectors. https://jina.ai/legal
- **Meta** (Send API) — receives the AI's reply to deliver to the
  customer's Messenger thread.
- **bKash / Nagad / SSLCommerz** (payments) — receive order metadata only
  when a payment link is generated.

We send Groq and Jina only what's necessary to generate one reply or one
embedding; they do not retain conversation history.

## Eval set (model improvement)

We use anonymised copies of conversations from design-partner merchants
(who explicitly agreed during pilot recruitment) to improve the AI's
Bangla quality. Customer names, phone numbers, addresses, and Facebook
PSIDs are hashed before storage. Merchants outside the design-partner
pilot are **not** included.

## Retention

- Active conversations: kept while the merchant account is active
- Agent run telemetry (token counts, latency, cost): 90 days
- Audit events: 365 days
- After account deletion: 30 days, then permanent purge

## Your rights (customer side)

Even though you (the end customer chatting with the merchant) are not our
direct customer, you have the right to:
- Know what we hold about you
- Request deletion
- Object to processing

Email **privacy@jobab.com** with your Facebook profile name and we will
locate your conversations across all connected merchants and delete them
within 14 days.

You can also remove the app from your Facebook permissions and Meta will
notify us via the data-deletion callback; we'll scrub your conversation
data automatically within 14 days.

## Children

We do not knowingly process data from anyone under 13.

## International transfers

Data may be processed in the US, EU, and Singapore via the sub-processors
above. We rely on standard contractual clauses and Meta's Platform Terms.

## Changes

We'll post any material changes here with a "last updated" timestamp.
For breaking changes (e.g., new sub-processor) we'll notify merchants in
the dashboard 14 days in advance.

## Contact

- privacy@jobab.com — privacy requests
- delete@jobab.com — data deletion shortcut (auto-routed)
- legal@jobab.com — legal correspondence

[Mailing address]
