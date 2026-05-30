# ADR 0001: pnpm workspaces for the monorepo

**Status:** Accepted · **Date:** 2026-05-29

## Context

The product is two apps (NestJS backend, Next.js dashboard) plus a shared
types/Zod package. We needed a way to:

- share types so the backend and web app can't drift,
- keep one lockfile so versions stay in sync,
- run cross-app scripts (test, lint, typecheck) from one root,
- keep the dev install fast.

## Decision

Adopt **pnpm workspaces** with the conventional `apps/*` and `packages/*`
layout. The shared package is `@jobab/shared`; both apps depend on it via
`workspace:*` and consume it through TypeScript project references so the
backend `rootDir` boundary stays clean.

## Alternatives considered

- **Yarn workspaces** — viable, but pnpm's content-addressed store is faster
  and more disk-efficient and we already have Volta with pnpm pinned.
- **Turborepo / Nx** — useful if/when the repo grows; deferred.
- **No monorepo, hand-mirrored types** — what we had; ad-hoc, error-prone.

## Consequences

- One `pnpm install` boots the entire repo.
- `pnpm -r typecheck/test/lint` runs across workspaces.
- The shared package must be `pnpm --filter @jobab/shared build` once before
  the first typecheck in a fresh clone.
- Dockerfiles must respect the monorepo (build context is the repo root).
