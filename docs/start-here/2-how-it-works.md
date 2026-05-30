# How Jobab works

This is the story of one customer message, from "ping" to "your bKash link
is ready." No code yet — just what happens.

## The cast

- **Customer** — someone on Facebook / Instagram / WhatsApp who messaged the shop
- **Merchant** — the shop owner watching the dashboard (or sleeping)
- **AI** — the language model deciding what to say back
- **Worker** — a background process that runs the AI without blocking anything

## Step by step

### 1. Customer sends a DM

The customer types something like:

> "ei sharita ache? medium lagbe, dhaka delivery hobe?"
> (and attaches a photo of a saree)

Facebook (or Instagram, or WhatsApp) calls a Jobab URL with the message.
Jobab checks that the call really came from Meta — not a hacker pretending —
and stores the message in the database.

### 2. The message goes into a queue

Jobab doesn't reply right away. It puts a job in a queue (Redis). This is so
the website that received the webhook can say "got it" fast, and the slow
work happens in the background.

If 50 customers message at once, they all queue up. None get dropped.

### 3. The worker wakes up

A background process pulls the job from the queue. It loads:

- The last ~40 messages in the conversation (so the AI has context)
- The merchant's "voice" instructions ("be warm, use customer's language, delivery is ৳80")
- The list of tools the AI is allowed to use

### 4. The AI thinks

The AI is Llama 3.3 (run by Groq, which is fast and cheap). It looks at the
message and decides what to do next. It can:

- Just reply with text ("আছে আপু, ১২৫০ টাকা")
- Use a tool first ("look up this product in the catalog before answering")
- Take an order ("save name, address, size, generate bKash link")
- Hand off to the merchant ("this is a complaint, I'm getting out of the way")

The AI doesn't have hard rules baked in. It has tools, and it picks which to
use based on the conversation.

### 5. If the customer sent a photo

The vision model (Llama 4 Scout) looks at the photo and describes what it
sees: "a red and white cotton saree with traditional design." That description
becomes a search query against the catalog.

The catalog search uses **vector embeddings** — basically, every product has
a numeric fingerprint, and we find products whose fingerprint is closest to
the photo's. If a match is good, the AI talks about that exact product. If
not, it shows the merchant the top candidates and asks "which one?"

### 6. The AI replies

Whatever the AI decides, the reply gets sent back to the customer via Facebook
(or Instagram / WhatsApp). The reply is also saved in the database so the
merchant sees it in the inbox in real time.

### 7. The merchant watches (or doesn't)

The dashboard shows the conversation as it happens. The merchant can:

- Let the AI handle it (most cases)
- Click "take over" and reply manually
- See exactly which tools the AI used, how many tokens it cost, how long it took

If the AI handed off because the customer complained, the merchant gets a
notification.

## In a picture

```
Customer DM ─► Webhook ─► Save message ─► Queue job ─► Worker
                                                          │
                                                          ▼
                                         ┌────────────────────────┐
                                         │  Load context (history,│
                                         │  merchant voice, tools)│
                                         └───────────┬────────────┘
                                                     ▼
                                              ┌─────────────┐
                                              │  Ask the AI │ ←─┐
                                              └──────┬──────┘   │
                                                     ▼          │ loop up to
                                          tool calls? ──yes──► run tool
                                                     │          │
                                                     no         │
                                                     ▼
                                            Send reply to customer
                                                     │
                                                     ▼
                                          Save in DB, push to dashboard
```

## What the AI is allowed to do — the tools

Each tool is a small backend function the AI can call:

| Tool                     | What it does                                            |
| ------------------------ | ------------------------------------------------------- |
| `search_catalog`         | Find products that match a text query                   |
| `check_stock`            | Look up live stock + price for a specific variant       |
| `match_product_by_image` | Match a customer's photo to a product (vision + search) |
| `record_order`           | Save the order with customer name, address, size, total |
| `generate_payment_link`  | Create a bKash payment link                             |
| `handoff_to_human`       | Stop replying, ping the merchant                        |

That's it. The AI can't read other merchants' data, can't email anyone, can't
do anything outside this list.

## Safety: the order guardrail

Before an order is finalized, a separate check runs (not the AI). It verifies:

- The product exists
- The variant is in stock
- The price matches what the AI quoted
- The total adds up correctly

If anything fails, the order is rejected and the AI tries again or hands off.
This is the [order guardrail](../build/decisions/0003-order-guardrail.md) — we
don't trust the AI alone with money.

## When the AI gets out of the way

The AI is told to hand off to the merchant when:

- The customer is angry or complaining
- There's a refund or payment dispute
- The customer asks for something the catalog doesn't have
- The conversation has gone in circles

Once handed off, the AI doesn't reply again until the merchant says "hand
back" in the dashboard.

## Next

- The 24-hour-window rule that controls when Jobab can reply at all: [Meta's rules, in plain English](./3-meta-rules-simple.md)
- The file-by-file codebase map: [ARCHITECTURE.md](../../ARCHITECTURE.md)
- Set it up locally and see the loop run: [build/1-setup.md](../build/1-setup.md)
