# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=20-alpine

# ─── deps stage ────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS deps
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile

# ─── build stage ────────────────────────────────────────────────────────────
FROM deps AS build
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN pnpm --filter @jobab/shared build
RUN pnpm --filter @jobab/web build

# ─── runtime stage (uses Next standalone output for slim image) ──────────────
FROM node:${NODE_VERSION} AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

# Copy the standalone Next build + static + public
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public

USER node
EXPOSE 3001
CMD ["node", "apps/web/server.js"]
