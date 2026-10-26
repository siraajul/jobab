# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS build
RUN apk add --no-cache openssl && corepack enable && corepack prepare pnpm@10.34.9 --activate
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/backend/package.json apps/backend/
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY packages/shared packages/shared
COPY apps/backend apps/backend
RUN pnpm --filter @jobab/shared build && pnpm --filter @jobab/backend prisma:generate && pnpm --filter @jobab/backend build
RUN pnpm --filter @jobab/backend deploy --prod --legacy /out
# Generate against the deployed dependency tree, rather than copying a guessed pnpm path.
RUN pnpm --filter @jobab/backend exec prisma generate --schema=/out/prisma/schema.prisma

FROM node:22-alpine AS runtime
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY --from=build --chown=node:node /out ./
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]

# Migrations use the build toolchain without adding development tools to runtime.
FROM build AS migrate
CMD ["pnpm", "--filter", "@jobab/backend", "prisma:deploy"]
