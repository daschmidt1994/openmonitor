# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
# Prisma's query engine binary is linked against OpenSSL; Alpine's default
# image ships neither by default and Prisma must see it at `generate` time
# to pick the right engine variant (openssl-3.0.x on modern Alpine).
RUN apk add --no-cache openssl
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/monitoring-engine/package.json packages/monitoring-engine/package.json
COPY packages/notifications/package.json packages/notifications/package.json
COPY packages/config/package.json packages/config/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm --filter @openmonitor/shared build \
 && pnpm --filter @openmonitor/database generate \
 && pnpm --filter @openmonitor/database build \
 && pnpm --filter @openmonitor/monitoring-engine build \
 && pnpm --filter @openmonitor/notifications build \
 && pnpm --filter @openmonitor/api build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app /app
WORKDIR /app/apps/api
EXPOSE 3001
HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=5 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||3001)+'/health', r => process.exit(r.statusCode===200?0:1)).on('error', () => process.exit(1))"
CMD ["node", "dist/main.js"]
