# Screencast script

Meta requires a screen recording for each permission you request,
showing the user-initiated flow that needs it. Keep each under 5 minutes.
Captions are essential — reviewers don't speak Bangla.

Record at 1280×800 minimum. Tools: Loom, QuickTime, or OBS.

---

## Screencast 1: `pages_messaging` (the core)

**Setup**: have the merchant dashboard open at `/inbox` and Messenger
open on a phone next to the screen recorder. The phone shows the
customer's POV.

**Shots**:

1. **0:00 — title card**
   `Jobab — pages_messaging`
   `Customer DMs the merchant. Jobab replies on the Page's behalf.`

2. **0:10 — wide shot**
   Phone (customer) on the left, dashboard (merchant) on the right.

3. **0:15 — customer types a Bangla message**
   On the phone, type: _"Apa, lal jamdani shari ache? medium lagbe"_
   Send.

4. **0:25 — message appears in the dashboard**
   The merchant sees the incoming DM in the Inbox list. Status pill:
   "AI handling". Caption: _"The Page receives the DM via Messenger
   webhook."_

5. **0:35 — the AI thinks**
   Show the "AI is thinking…" indicator under the customer's message.
   Caption: _"Jobab calls search_catalog, finds the product."_

6. **0:45 — AI reply lands**
   Reply appears in the dashboard _and_ on the customer's Messenger.
   Caption: _"Jobab sends the reply via Send API."_

7. **0:55 — merchant takes over**
   Click "Take over" — pill turns to "You're handling".
   Caption: _"At any time the merchant can take over."_

8. **1:05 — merchant sends a manual reply**
   Type a custom reply in the composer, hit send. Show it arrive on
   the phone.

9. **1:15 — end card**
   `Jobab — building Bangladesh's fastest merchant`

---

## Screencast 2: `pages_read_engagement` + `pages_manage_engagement` (comments)

**Setup**: same dashboard open at `/comments`. Open the actual Facebook
Page on a second window so the reviewer can see the public-side
comment + reply.

**Shots**:

1. **0:00 — title card**
   `Jobab — comment-to-DM flow`

2. **0:10 — show a Page post / ad**
   On Facebook, find the most recent post on the test Page.

3. **0:15 — customer comments**
   As the test customer, comment under the post: _"price?"_

4. **0:25 — comment appears in dashboard**
   /comments page shows the new row with intent "price" and confidence
   pct. Caption: _"Jobab classifies the intent via LLM + heuristic."_

5. **0:35 — public reply lands**
   Refresh the Facebook post — the merchant's public reply
   ("apnake inbox e details pathiyechi 🙂") is now there.
   Caption: _"Public reply sent via pages_manage_engagement."_

6. **0:45 — DM appears**
   On the test customer's Messenger, the merchant's Page has sent them
   a DM. Caption: _"Private reply opens a DM thread — agent loop takes
   over from here."_

7. **0:55 — end card**

---

## Screencast 3: `pages_manage_metadata` (subscription)

**Setup**: dashboard at `/onboarding`. Already have a Page in your test
Business Manager.

**Shots**:

1. **0:00 — title card**
   `Jobab — onboarding: connecting a Page`

2. **0:10 — sign in**
   Click "Connect Facebook Page" → Facebook login dialog → consent screen
   shows the exact permissions requested.

3. **0:30 — page selection**
   The user picks one Page from their Business Manager.

4. **0:40 — confirmation**
   Dashboard shows the Page connected, webhook subscribed flag = true.
   Caption: _"Jobab subscribes the Page to messages + feed webhooks."_

5. **0:55 — end card**

---

## Recording checklist before you submit

- [ ] All test data + UI is in English or has English captions
- [ ] No real customer's PII shown — use Meta test users only
- [ ] Audio is clear OR you've added captions
- [ ] Each screencast is < 5 min
- [ ] Each screencast shows ONE permission's use case end-to-end
- [ ] File sizes < 100 MB each (Meta limit)
- [ ] Uploaded via the App Review form, not linked from Drive
