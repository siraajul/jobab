# Contributing

## Setup

1. **Node 20+, pnpm 9+, Docker.**
2. `pnpm install`
3. `pnpm --filter @jobab/shared build` (only needed once for fresh clones)
4. `pnpm --filter @jobab/backend prisma:generate`
5. `docker compose up -d` for Postgres + Redis.
6. `cp apps/backend/.env.example apps/backend/.env` and fill the values.
7. `cp apps/web/.env.example apps/web/.env.local` and set `DEV_PASSWORD`.
8. `pnpm db:migrate` and `pnpm db:seed`.

Then:

- `pnpm --filter @jobab/backend start:dev`
- `pnpm --filter @jobab/backend start:worker:dev`
- `pnpm --filter @jobab/web dev`

## Conventions

- **Commits**: Conventional Commits (`feat: …`, `fix: …`, `chore: …`).
  Enforced by commitlint via `simple-git-hooks`.
- **Formatting**: Prettier auto-formats on commit (lint-staged). Run
  `pnpm format` to apply manually.
- **Linting**: ESLint flat config in each app.
- **Tests**: Jest in the backend, RTL/Vitest planned for the web.
- **Types**: shared types live in `@jobab/shared`. Don't hand-write a type in
  the web app that already exists in shared.

## Pre-PR checklist

```
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
```

CI runs the same on every PR.

## Architecture decisions

Big or non-obvious choices go in `docs/adr/`. Use the existing files as a
template (Context · Decision · Alternatives · Consequences).
