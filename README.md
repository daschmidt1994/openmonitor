# OpenMonitor

A modern, self-hosted monitoring platform in the spirit of Uptime Kuma — but
built from day one for multi-user operation, a clean versioned REST API, API
tokens, public status pages, and a future native Android app.

## Table of contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Requirements](#requirements)
- [Installation (Docker)](#installation-docker)
- [Configuration / environment variables](#configuration--environment-variables)
- [Creating the first admin](#creating-the-first-admin)
- [Using the API](#using-the-api)
- [Creating an API token](#creating-an-api-token)
- [Backup](#backup)
- [Restore](#restore)
- [Updating](#updating)
- [Troubleshooting](#troubleshooting)
- [Configuring the Android app](#configuring-the-android-app)
- [Development](#development)

## Overview

OpenMonitor lets you monitor websites, APIs, servers and network services from
your own infrastructure, with no dependency on an external cloud service for
its core functionality.

Supported monitor types:

- **HTTP/HTTPS** — status code, keyword matching, JSON response assertions
- **TCP** port checks
- **PING** (ICMP, via the system `ping` binary)
- **DNS** record resolution (A/AAAA/CNAME/MX/TXT/NS) with expected-value checks
- **SSL** certificate expiry monitoring (standalone, or attached to any HTTPS monitor)

Every monitor tracks status, response time, HTTP status code, error messages,
uptime and downtime, with 1h/24h/7d/30d history views and charts.

## Architecture

This is a pnpm/Turborepo monorepo:

```
apps/
  api/      NestJS REST API (auth, users, monitors, incidents, notifications,
            status pages, API tokens, system info) - versioned under /api/v1
  worker/   Standalone monitoring engine: scheduler + BullMQ job queue +
            checkers + incident detection + notification dispatch. Runs as
            its own process/container, independent of the API.
  web/      Next.js 14 dashboard (App Router, Tailwind CSS, dark mode)
  android/  (planned) Kotlin + Jetpack Compose client for the same REST API

packages/
  database/           Prisma schema, migrations, generated client
  shared/              Cross-app enums, zod schemas, error types
  monitoring-engine/   Pure, testable checker implementations (HTTP/TCP/PING/
                       DNS/SSL/JSON) + uptime calculation - used by the worker
  notifications/       Notification provider adapters (Email/Discord/Slack/
                       Telegram/generic Webhook) behind one interface
  api-client/          Typed REST client shared by the web app (and any other
                       TypeScript consumer)
  config/              Shared lint config
```

**Why this split?** The monitoring engine and the notification providers are
pure packages with no framework dependency, so they're unit-testable in
isolation and reusable outside the worker (e.g. a future CLI). The worker is
a separate deployable process from the API — a slow or hanging check can
never block the HTTP server, and the worker keeps running (and picks back up
exactly where it left off, via monitors' persisted `nextCheckAt`) across
restarts because scheduling state lives in Postgres, not in memory.

**Tech stack**

| Layer | Choice | Why |
|---|---|---|
| API | NestJS + TypeScript | DI, guards/interceptors map cleanly onto auth/RBAC/scopes; built-in OpenAPI generation |
| Web | Next.js 14 (App Router) + Tailwind | SSR for public status pages, CSR for the authenticated dashboard |
| Database | PostgreSQL | Reliable, relational, works well with high-volume time-series-like `MonitorCheck` rows |
| ORM | Prisma | Type-safe queries + a real migration system |
| Queue | Redis + BullMQ | Battle-tested job queue with retries/concurrency, survives restarts |
| Auth | JWT access token + rotating opaque refresh token | Short-lived access tokens, refresh-token-theft detection via reuse-revocation |
| Passwords | Argon2id | Current OWASP-recommended password hash |

## Requirements

- Docker Engine 24+ and Docker Compose v2 (`docker compose`)
- 1 vCPU / 1 GB RAM minimum for a small number of monitors
- Outbound network access from the `worker` container to whatever you want to monitor

## Installation (Docker)

```bash
git clone <this-repo-url> openmonitor
cd openmonitor
cp .env.example .env
# edit .env: set POSTGRES_PASSWORD and JWT_ACCESS_SECRET at minimum
#   openssl rand -base64 48   # good way to generate JWT_ACCESS_SECRET

docker compose up -d --build
```

This starts:

- `postgres` — the database (persisted in the `postgres-data` volume)
- `redis` — the job queue backend (persisted in the `redis-data` volume)
- `migrate` — a one-shot container that applies Prisma migrations and
  (idempotently) creates the bootstrap admin if `ADMIN_EMAIL`/`ADMIN_USERNAME`/
  `ADMIN_PASSWORD` are set in `.env`
- `api` — the REST API on `http://localhost:${API_PORT:-3001}`
- `worker` — the monitoring engine (no exposed port)
- `web` — the dashboard on `http://localhost:${WEB_PORT:-3000}`

Check everything is healthy:

```bash
docker compose ps
curl http://localhost:3001/health
curl http://localhost:3001/ready   # also checks the database connection
```

Open `http://localhost:3000` in a browser and register the first account —
**the first user to register automatically becomes an admin**.

## Configuration / environment variables

All configuration is via environment variables, set in `.env` (see
`.env.example` for the full list with defaults). The most important ones:

| Variable | Required | Description |
|---|---|---|
| `POSTGRES_PASSWORD` | **yes** | Database password |
| `JWT_ACCESS_SECRET` | **yes** | Signs access tokens; ≥32 random chars |
| `ADMIN_EMAIL` / `ADMIN_USERNAME` / `ADMIN_PASSWORD` | no | Bootstrap admin created once by `migrate`; if unset, the first person to register becomes admin instead |
| `CORS_ORIGINS` | no | Comma-separated origins allowed to call the API from a browser |
| `PUBLIC_BASE_URL` | no | Public URL of the web app, used to build links in notifications |
| `REGISTRATION_ENABLED` | no | Set `false` to disable self-registration (admins can still create users); can also be toggled at runtime by an admin in Settings |
| `CHECK_RETENTION_DAYS` | no | How long `MonitorCheck` history is kept before the worker prunes it (default 90) |
| `SCHEDULER_POLL_INTERVAL_MS` / `CHECK_CONCURRENCY` | no | Worker scheduling tuning |
| `NEXT_PUBLIC_API_BASE_URL` | no | The URL the *browser* uses to reach the API. Baked in at web build time — if you change it, rebuild the `web` image |

Behind a reverse proxy (Traefik/nginx) with a real domain, set
`CORS_ORIGINS`, `PUBLIC_BASE_URL` and `NEXT_PUBLIC_API_BASE_URL` to your
actual public URLs and terminate TLS at the proxy.

## Creating the first admin

Two ways:

1. **Automatic**: the first account ever registered (via the web UI or
   `POST /api/v1/auth/register`) becomes `ADMIN`. Everyone after that is a
   regular `USER`.
2. **Explicit bootstrap**: set `ADMIN_EMAIL`, `ADMIN_USERNAME`,
   `ADMIN_PASSWORD` in `.env` before the first `docker compose up`. The
   `migrate` service creates this admin once (it's a no-op on every
   subsequent start once any admin exists).

## Using the API

The full core functionality is available over a versioned REST API under
`/api/v1`. Interactive OpenAPI/Swagger docs are served at:

```
http://localhost:3001/api/docs
```

Example flow:

```bash
# Register (or log in)
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"..."}'
# -> { "user": {...}, "tokens": { "accessToken": "...", "refreshToken": "..." } }

# Create a monitor
curl -X POST http://localhost:3001/api/v1/monitors \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"name":"My site","type":"HTTP","target":"https://example.com","interval":60}'

# Read its history
curl http://localhost:3001/api/v1/monitors/<id>/history?range=24h \
  -H "Authorization: Bearer <accessToken>"
```

Access tokens expire after 15 minutes by default; use
`POST /api/v1/auth/refresh` with the refresh token to get a new pair (the
refresh token itself rotates on every use).

## Creating an API token

For long-lived, scriptable access (CI, integrations, the future Android app)
use an API token instead of the short-lived session tokens:

1. In the web UI: **Settings → API tokens → Create token**, pick the scopes
   you need (`monitors:read`, `monitors:write`, `incidents:read`,
   `status-pages:read`, `status-pages:write`, `notifications:read`,
   `notifications:write`, `users:read`).
2. Or via the API: `POST /api/v1/api-tokens` with `{"name": "...", "scopes": [...]}`.
3. **The plaintext token is shown exactly once**, at creation time — copy it
   immediately. Only its SHA-256 hash is ever stored.
4. Use it the same way as an access token: `Authorization: Bearer om_...`.
5. Revoke with `DELETE /api/v1/api-tokens/:id` (or the UI) at any time.

## Backup

Everything that matters lives in the Postgres volume. To back it up:

```bash
docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > openmonitor-backup-$(date +%F).sql.gz
```

Redis only holds transient job-queue state (no monitor configuration or
history) and does not need to be backed up.

## Restore

```bash
docker compose stop api worker
gunzip -c openmonitor-backup-2026-01-01.sql.gz | docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
docker compose start api worker
```

## Updates

```bash
git pull
docker compose build
docker compose up -d
```

The `migrate` service re-runs on every `up`, applying any new Prisma
migrations automatically before `api`/`worker` start (they wait for it via
`depends_on: condition: service_completed_successfully`).

## Troubleshooting

- **`api`/`worker` won't start, log mentions `JWT_ACCESS_SECRET`**: it must be
  set and at least 32 characters — generate one with `openssl rand -base64 48`.
- **`migrate` container exits non-zero**: check `docker compose logs migrate`;
  usually a database connectivity issue — confirm `POSTGRES_PASSWORD` matches
  between `postgres` and the dependent services (they share the same `.env`).
- **PING monitors always fail**: the `worker` container needs the `NET_RAW`
  capability (already granted in `docker-compose.yml` via `cap_add`); if you
  run the worker outside Docker Compose, grant it manually or run as root.
- **Web app can't reach the API from the browser (CORS or network errors)**:
  `NEXT_PUBLIC_API_BASE_URL` must be a URL reachable from the *browser*, not
  just from inside the Docker network — and since it's baked in at build
  time, changing it requires `docker compose build web` again. Also check
  `CORS_ORIGINS` on the API includes the web app's origin.
- **Notifications aren't sending**: use "Send test" on the provider in
  Settings → Notifications; the error message returned there is the same one
  the worker logs when a real check fails.

## Configuring the Android app

*(Planned — see `apps/android`. Backend/API are stable and fully tested;
Android development starts once the web app has stabilized further.)*

The Android app will not embed its own business logic — it talks to the same
REST API described above. To point it at your instance:

1. Open the app, go to **Settings → Server**.
2. Enter your instance's public URL, e.g. `https://monitor.example.com`.
3. Log in with your OpenMonitor account (or use an API token).

Credentials are stored using the Android Keystore / EncryptedSharedPreferences.

## Development

```bash
pnpm install

# Start local infra
docker compose up -d postgres redis

# Apply migrations
pnpm db:migrate

# Run each app in dev mode (separate terminals)
pnpm --filter @openmonitor/api dev
pnpm --filter @openmonitor/worker dev
pnpm --filter @openmonitor/web dev

# Tests
pnpm test                 # unit tests across all packages
pnpm --filter @openmonitor/api test:e2e   # API integration tests (needs a Postgres test DB)
```

See `packages/monitoring-engine` and `packages/notifications` for the
checker/notification-provider unit tests, and `apps/api/test` /
`apps/worker/src/__tests__` for the integration tests covering
authentication, authorization, tenant isolation, monitor CRUD, the
retry/confirmation anti-flapping logic, incident creation, and API tokens.
