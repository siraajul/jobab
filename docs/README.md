---
layout: home

hero:
  name: Jobab
  text: AI shop assistant for Bangladeshi merchants
  tagline: Answers DMs in Bangla. Takes orders. Generates bKash links. Hands off to a human when things go sideways.
  image:
    src: /logo.svg
    alt: Jobab
  actions:
    - theme: brand
      text: What is Jobab?
      link: /start-here/1-what-is-jobab
    - theme: alt
      text: Run it locally
      link: /build/1-setup
    - theme: alt
      text: GitHub
      link: https://github.com/siraajul/jobab

features:
  - icon:
      src: /icons/start-here.svg
      alt: ''
    title: Start here
    details: Plain-English overview of the product, how the AI loop works, and the Meta rules that shape it. No coding knowledge needed.
    link: /start-here/1-what-is-jobab
    linkText: Read the intro

  - icon:
      src: /icons/build.svg
      alt: ''
    title: Build
    details: Get the project running on your machine in 15 minutes. Read the API guide. Understand every library on the stack.
    link: /build/1-setup
    linkText: Local setup

  - icon:
      src: /icons/ship.svg
      alt: ''
    title: Ship
    details: Connect a real Facebook / Instagram / WhatsApp page. Get past Meta's App Review. Launch with the first pilot merchants.
    link: /ship/1-channel-plan
    linkText: Channel plan

  - icon:
      src: /icons/status.svg
      alt: ''
    title: Status
    details: What's done, what's blocking the pilot, what to build next. The honest list.
    link: /status
    linkText: See current status

  - icon:
      src: /icons/legal.svg
      alt: ''
    title: Legal
    details: Privacy policy and data-deletion endpoint specs that Meta App Review requires.
    link: /legal/privacy-policy
    linkText: Read the policies

  - icon:
      src: /icons/decisions.svg
      alt: ''
    title: Architecture decisions
    details: Short records of the big calls — pnpm monorepo, LLM provider interface, order guardrail.
    link: /build/decisions/
    linkText: Browse decisions
---

## Quickstart paths

If you're not sure where to begin:

- **"What is this project?"** → [What is Jobab?](./start-here/1-what-is-jobab.md) → [How it works](./start-here/2-how-it-works.md)
- **"I'm a developer, get me set up"** → [Local setup](./build/1-setup.md) → [API guide](./build/2-api-guide.md) → [Tech stack](./build/3-tech-stack.md)
- **"I want to connect a real Facebook Page"** → [Meta's rules first](./start-here/3-meta-rules-simple.md) → [Step-by-step setup](./ship/2-meta-setup.md)
- **"Where's the project at right now?"** → [Status](./status.md)

## The repo

```
jobab/
├── apps/
│   ├── backend/    NestJS API + agent worker
│   ├── web/        Next.js merchant dashboard
│   ├── mobile/     Expo app (early stage)
│   └── docs/       This site (VitePress)
├── packages/
│   └── shared/     Zod schemas — single source of truth for API types
└── docs/           Markdown source for this site (also renders on GitHub)
```

Built by the Jobab team for Bangladeshi merchants who run shops out of their
DMs. _Jobab_ (জবাব) means "answer" or "reply" in Bangla.
