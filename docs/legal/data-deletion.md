# Data Deletion Instructions

## How to request deletion

You have **two paths**, both equivalent:

### 1. Via Facebook (automatic)

1. Open Facebook → Settings & Privacy → Settings → Apps and Websites.
2. Find "Jobab" in the active list.
3. Tap "Remove".
4. Facebook will send a deletion request to us automatically. We scrub
   your conversations across all connected merchants within 14 days.

### 2. Via email

Send a message to **delete@jobab.com** including:
- Your Facebook profile name
- (Optional) the merchant page(s) you've chatted with

We'll confirm receipt within 48 hours and complete the deletion within
14 days.

## What gets deleted

- Every conversation between you and any merchant using Jobab
- Every message in those conversations
- Any image attachment URLs we stored
- Any contact info (name, phone, address) you shared in chat

## What is preserved

- Order records the merchant placed are kept (the merchant needs them
  for accounting / tax / fulfilment), but **your personal information**
  on those records is replaced with `[deleted]`.

## Confirmation

You'll receive a deletion confirmation code at the email you used to
request it. Reference this code in any follow-up.

## Public callback URL

`https://[your-domain]/webhooks/meta/data-deletion`

This is the URL configured in the Meta App Dashboard under
**Settings → Data Deletion Callback URL**.
