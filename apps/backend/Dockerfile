# syntax=docker/dockerfile:1.7

# Multi-stage build for the backend. Uses pnpm at the monorepo root so the
# workspace + shared package install correctly.

ARG NODE_VERSION=20-alpine

# ─── deps stage — install ALL deps (incl. dev) once for both build + worker ──
FROM node:${NODE_VERSION} AS deps
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/backend/package.json apps/backend/
RUN pnpm install --frozen-lockfile

# ─── build stage — compile shared + backend ────────────────────────────────
FROM deps AS build
COPY packages/shared packages/shared
COPY apps/backend apps/backend
RUN pnpm --filter @jobab/shared build
RUN pnpm --filter @jobab/backend prisma:generate
RUN pnpm --filter @jobab/backend build

# ─── runtime stage — slim production image ──────────────────────────────────
FROM node:${NODE_VERSION} AS runtime
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /repo

ENV NODE_ENV=production
ENV PORT=3000

# install ONLY production deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/backend/package.json apps/backend/
RUN pnpm install --frozen-lockfile --prod

# bring compiled output + Prisma schema/migrations
COPY --from=build /repo/packages/shared/dist packages/shared/dist
COPY --from=build /repo/apps/backend/dist apps/backend/dist
COPY apps/backend/prisma apps/backend/prisma
COPY --from=build /repo/apps/backend/node_modules/.prisma apps/backend/node_modules/.prisma
COPY --from=build /repo/apps/backend/node_modules/@prisma apps/backend/node_modules/@prisma

USER node
EXPOSE 3000
# default to API; override CMD to start the worker
CMD ["node", "apps/backend/dist/main.js"]
