# Jobab Web (Phase 1)

Next.js 14 app router · React · Tailwind. Implements the merchant dashboard
against the backend in `/backend`. The design tokens in `app/globals.css` and
`tailwind.config.ts` are a 1:1 port of the prototype at the repo root
(`/app.css`), so the visual output matches the design.

## Layout
```
app/
  layout.tsx         html shell + theme-light class
  page.tsx           redirects to /inbox
  inbox/
    page.tsx         server component — fetches from backend, falls back
                     to fixtures when the backend is unreachable
    InboxClient.tsx  three-column inbox (list · thread · order panel) with
                     selection, take-over, optimistic merchant reply
  globals.css        design tokens (port of /app.css §THEMES)
components/
  Avatar, ConversationRow, MessageBubble, StatusPill,
  TakeoverToggle, Composer, OrderPanel, NavRail
lib/
  cn.ts        clsx + tailwind-merge helper
  api.ts       fetch wrapper to /backend (sends x-org-id header)
  types.ts     hand-written types matching Prisma models
  fixtures.ts  demo data mirroring /jobab-data.js
```

## Boot
```
cp .env.example .env.local       # set NEXT_PUBLIC_API_URL + NEXT_PUBLIC_ORG_ID
npm install
npm run dev                      # http://localhost:3001
```

If `NEXT_PUBLIC_ORG_ID` is still `replace-me` or the backend isn't up, the
page renders demo data so you can iterate on visuals without infra.

## Compared to the prototype
- The prototype uses Babel-standalone + CDN React and ships sample data
  inline. This app is a real Next.js project, with the tokens lifted into
  Tailwind and the data fetched from the backend.
- The "tweaks" panel (bubble style, accent picker, light/dark toggle) is
  intentionally not ported — those were design-exploration controls. Add
  back later as a settings drawer if useful.

## Not yet built
- Mobile conversation view (port `jobab-mobile.jsx`).
- Light/dark switcher (just flip `theme-light` → `theme-dark` on `<body>`).
- Auth — currently relies on `x-org-id` header. Plug in Clerk / Supabase
  Auth when §11 lands.
- Other pages (Orders, Catalog, Settings) — schema and APIs are ready.
