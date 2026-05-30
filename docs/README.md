# Jobab docs

Pick the path that matches what you came here to do.

---

## I want to understand the product

Read these in order. No coding knowledge needed.

1. [What is Jobab?](./start-here/1-what-is-jobab.md) — the product in one page
2. [How it works](./start-here/2-how-it-works.md) — what happens when a customer sends a DM
3. [Meta's rules, in plain English](./start-here/3-meta-rules-simple.md) — why the AI can do some things and not others

---

## I want to run the code

You're a developer cloning the repo for the first time.

1. [Local setup](./build/1-setup.md) — get the app running on your machine (about 15 minutes)
2. [API guide](./build/2-api-guide.md) — how the backend works, auth, error shapes
3. [Architecture](https://github.com/siraajul/jobab/blob/main/ARCHITECTURE.md) — the codebase map (one document, read it once)
4. [Contributing](https://github.com/siraajul/jobab/blob/main/CONTRIBUTING.md) — conventions, commits, PRs
5. [Architecture decisions](./build/decisions/) — why the codebase looks the way it does

---

## I want to go live on Facebook / Instagram / WhatsApp

Connecting Jobab to real customer DMs.

1. [Channel plan](./ship/1-channel-plan.md) — why we ship Messenger + Instagram first, WhatsApp second
2. [Step-by-step Meta setup](./ship/2-meta-setup.md) — what to click, what to copy, what to expect
3. [App Review submission kit](./ship/app-review/) — get past Meta's gatekeeper
4. [Pilot launch plan](./ship/pilot/) — find and onboard the first 3-5 merchants

---

## I need legal / compliance

- [Privacy policy draft](./legal/privacy-policy.md)
- [Data deletion endpoint spec](./legal/data-deletion.md)

---

## What's the state of the project right now?

- [Status — what's done, what's left, what's blocking](./status.md)

---

## Folder layout

```
docs/
├── start-here/   ← read first if you're new
├── build/        ← for developers
├── ship/         ← for going live with merchants
├── legal/        ← privacy + data deletion
└── status.md     ← current state of the project
```

The numbered prefixes inside each folder are the reading order.
