# Use-case write-up

Paste these blocks into the matching fields in the Meta App Review form.

---

## App overview (high level)

Jobab is an AI sales assistant for Bangladeshi social-commerce merchants
who sell clothing, accessories, and home goods through Facebook Pages.
Most of our merchants are one-person shops who can't keep up with the
volume of customer DMs they receive — especially at night. Jobab connects
to their Page, reads incoming customer messages, replies in the
customer's language (Bangla, Banglish, or English) using the merchant's
real product catalog, and assembles orders. The merchant uses our
dashboard to watch the AI, take over any conversation, and review orders
before fulfilment.

## `pages_messaging`

We use `pages_messaging` to (a) receive incoming Messenger messages from
the Page's customers via webhook, and (b) send AI-generated replies on
the Page's behalf using the Send API. Without this permission Jobab
cannot perform its core function — there is no other way to serve a
customer who DMs the Page.

Every message is initiated by a customer DMing the merchant's Page.
Replies are sent within the 24-hour standard messaging window. We do
not initiate conversations and do not send unsolicited messages.

## `pages_manage_metadata`

We use `pages_manage_metadata` solely to subscribe the merchant's Page to
the `messages` and `feed` webhook events when the merchant onboards. We
do not modify any other Page metadata.

## `pages_read_engagement`

We use `pages_read_engagement` to receive `feed` webhook events for new
comments on the merchant's Page posts and ads. Comments are the highest-
intent moment in Bangladeshi social commerce — customers comment "price?"
on a post and expect a fast reply. Reading them lets us route the
commenter into a Messenger conversation where the merchant can complete
the sale.

## `pages_manage_engagement`

We use `pages_manage_engagement` to (a) post a short, neutral public
reply to a comment (e.g., "I've sent the details to your inbox") and
(b) send a Messenger private reply to the commenter so the conversation
moves to DM. Both replies are merchant-configured templates per intent
category (price / question / buy). Spam and abuse-classed comments are
not replied to.

## Why we need Advanced Access

Standard Access caps us at the test users in the developer's role. We
need Advanced Access to operate on the Pages of our paying merchants —
each merchant connects their own Page using OAuth from our dashboard.

## How users start

1. The merchant signs up at https://jobab.com/login and connects their
   Facebook Page via Facebook Login.
2. Jobab subscribes the Page to webhook events.
3. The merchant uploads a CSV catalog or connects Shopify/WooCommerce.
4. The merchant writes a short "AI instructions" paragraph in their
   voice (delivery rates, payment preference, tone).
5. Jobab begins replying to incoming customer DMs.

## Disclosure to end users

The merchant can toggle a "this shop uses an AI assistant for faster
replies" line that ships in the AI's first reply to each new customer.
Default: on for the pilot. Required by Meta's Platform Terms.
