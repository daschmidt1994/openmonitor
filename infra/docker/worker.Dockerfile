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
 && pnpm --filter @openmonitor/worker build

FROM base AS runtime
ENV NODE_ENV=production
# iputils provides the `ping` binary used by the PING checker (see
# packages/monitoring-engine/src/checkers/ping.ts). It ships with the Linux
# CAP_NET_RAW capability bit set, but the container still needs
# `cap_add: [NET_RAW]` (see docker-compose.yml) to actually use it.
RUN apk add --no-cache iputils bind-tools
COPY --from=build /app /app
WORKDIR /app/apps/worker
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=5 \
  CMD node -e "const IORedis=require('ioredis');const r=new IORedis(process.env.REDIS_URL||'redis://redis:6379',{maxRetriesPerRequest:1,lazyConnect:true});r.connect().then(()=>r.ping()).then(()=>{process.exit(0)}).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]
