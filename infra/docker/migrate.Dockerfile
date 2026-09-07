# syntax=docker/dockerfile:1
# One-shot image that applies Prisma migrations and (idempotently) seeds the
# bootstrap admin user. Run as a docker-compose service that api/worker wait
# on via `depends_on: condition: service_completed_successfully`.

FROM node:22-alpine AS base
RUN apk add --no-cache openssl
RUN corepack enable
WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY packages/database/package.json packages/database/package.json
RUN pnpm install --frozen-lockfile --filter @openmonitor/database...

COPY packages/database packages/database
WORKDIR /app/packages/database
RUN npx prisma generate

ENTRYPOINT ["sh", "-c", "npx prisma migrate deploy && node -r ts-node/register/transpile-only src/seed.ts"]
