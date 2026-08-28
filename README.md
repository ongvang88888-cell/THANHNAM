# Education Commerce Platform

**Status:** Architecture complete · D1–D5 locked · **MVP + completion features running**

A production-grade platform for selling video courses, digital documents, bundles/combos, subscriptions, and rewarded-ad unlocks — with Student, Teacher, Admin, and Public Storefront surfaces on Web and Mobile.

## Current phase

| Phase | Name | Status |
|-------|------|--------|
| 0 | Requirements analysis | Done |
| 1 | Architecture Package | Done |
| 1b | Decisions D1–D5 | Locked — [architecture/DECISIONS_D1_D5.md](./architecture/DECISIONS_D1_D5.md) |
| 5+ | Implementation | **Running** — [docs/IMPLEMENTATION_STATUS.md](./docs/IMPLEMENTATION_STATUS.md) |

## Quick start (local)

Prerequisites: Node 20+, pnpm 9, PostgreSQL 16, Redis.

```bash
cp .env.example .env
# ensure DATABASE_URL / Redis match your local services

pnpm install
pnpm db:generate
pnpm db:push
pnpm db:seed

# API (NestJS) — compile then run (tsx breaks DI metadata)
cd apps/api && pnpm exec tsc -p tsconfig.json && node dist/main.js

# Web (Next.js) — another terminal
cd apps/web && NEXT_PUBLIC_API_URL=http://127.0.0.1:3001/api/v1 pnpm dev

# Workers (optional)
cd apps/workers && pnpm exec tsx src/main.ts

# Mobile (Expo shell)
cd apps/mobile-student && pnpm start
```

API: `http://127.0.0.1:3001/api/v1/health`  
Web: `http://127.0.0.1:3000`

### Demo accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@edu.local` | `Password123!` |
| Teacher | `teacher@edu.local` | `Password123!` |
| Student | `student@edu.local` | `Password123!` |

Header: `X-App-Id: education_app`

## Priority order (non-negotiable)

CORRECTNESS → SECURITY → RELIABILITY → MAINTAINABILITY → REUSABILITY → SCALABILITY → PERFORMANCE → DX → SPEED

## Repository layout

```
apps/
  api/              # NestJS modular monolith
  web/              # Next.js unified storefront + student + teacher + admin
  mobile-student/   # Expo React Native student shell
  workers/          # BullMQ background jobs
packages/
  shared-core/      # errors, roles helpers
  education-core/   # progress, certificates
  monetization-core/# access engine, fulfillment, payment/reward ports
  media-core/       # storage ports + MIME allowlist
  database/         # Prisma schema + seed
docs/               # canonical documentation
architecture/       # Architecture Package deep dives
.cursor/rules/      # Cursor / agent governance
```

## Architecture docs

1. [`ARCHITECTURE_PACKAGE.md`](./ARCHITECTURE_PACKAGE.md) — master index
2. [`docs/DEVELOPMENT_GUIDE.md`](./docs/DEVELOPMENT_GUIDE.md)
3. [`docs/NEW_APP.md`](./docs/NEW_APP.md)
4. [`.cursor/rules/`](./.cursor/rules/)

## Sibling product (not App #2)

[Facebook Market Radar (VN)](./facebook-market-radar/) is a separate Next.js + SQLite app for **estimated** Facebook ad-market rankings. It does not share Education Core, payments, or AdMob.

```bash
cd facebook-market-radar
cp .env.example .env
pnpm --filter facebook-market-radar db:generate
pnpm --filter facebook-market-radar db:push
pnpm --filter facebook-market-radar db:seed
pnpm --filter facebook-market-radar test
pnpm --filter facebook-market-radar dev   # http://127.0.0.1:3100
```

## License / secrets

No secrets in source. Use environment / secret manager only.
