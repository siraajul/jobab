# What is Jobab?

Jobab is an AI shop assistant for Bangladeshi merchants who sell on Facebook,
Instagram, and WhatsApp.

## The problem we're solving

Picture a saree shop in Dhaka. The whole business runs out of a Facebook page.
Customers see a photo, they DM "এই শাড়িটা আছে? দাম কত? মিডিয়াম লাগবে।" and the
shop owner answers from her phone. She replies all day, every day, to hundreds
of these messages. She still misses some. She still loses sales because she
was eating dinner.

She doesn't have a website. She doesn't want a website. Her customers don't
browse — they message.

This is most retail in Bangladesh.

## What Jobab does

When a customer sends a DM, an AI answers in their language — Bangla, Banglish
(Bangla written in English letters), or English. It looks at the customer's
photo, finds the matching product in the merchant's catalog, quotes the price,
asks for size and address, takes the order, and sends a bKash payment link.

If the customer has a problem — "you sent the wrong colour" — the AI stops and
hands the conversation to the merchant. No bad customer experience, no awkward
robot replies.

The merchant watches everything live in a dashboard. She can step in any time,
take over a conversation, or let the AI run.

## Who it's for

- A shop owner who spends 6+ hours a day on DMs and can't keep up
- A merchant who already uses Lazychat or similar tools and wants better AI
- Anyone selling physical goods through Facebook / Instagram in Bangladesh

## What it's not

- Not a website builder
- Not a marketplace
- Not a chatbot you train from scratch
- Not for businesses outside Bangladesh (it's tuned for Bangla and bKash)

## What makes it different

Three things competitors don't do well:

**Real product recognition from photos.** A customer sends "এইটা" with a
picture. Jobab finds the actual matching product in the merchant's catalog,
not a generic answer. This uses a vision model plus database search.

**Order-taking in Bangla.** Most chatbots speak English or output text that
sounds machine-translated. Jobab speaks the way the customer speaks —
including Banglish like "lal jamdani shari ache?"

**Live cost transparency.** The merchant sees what every AI conversation cost
(tokens, latency, model used). No surprise bills.

## What you'll see if you log in right now

The dashboard has six screens:

- **Inbox** — every conversation across Facebook, Instagram, WhatsApp on one screen
- **Orders** — created → confirmed → shipped → delivered, with bKash payment status
- **Catalog** — products and stock (imported from CSV, Shopify, or WooCommerce)
- **Comments** — replies to Facebook post comments (auto-DM follow-up)
- **Analytics** — AI vs. merchant-handled chats, revenue, cost, response time
- **Settings + Team** — invite agents, set the AI's tone of voice, connect a Facebook Page

Screenshots are in [the main README](https://github.com/siraajul/jobab#a-quick-tour).

## Next

- Curious how the AI actually works? Read [How it works](./2-how-it-works.md).
- Wondering why some things are forbidden? Read [Meta's rules, in plain English](./3-meta-rules-simple.md).
- Ready to run it locally? Jump to [build/1-setup.md](../build/1-setup.md).
