# Implementation status (Phase 5 MVP)

Last updated: 2026-08-25

## Done

- Monorepo: pnpm + Turborepo (`apps/*`, `packages/*`)
- Prisma schema + seed (`education_app`, demo users, course/document/bundle, reward policy)
- Packages: `shared-core`, `education-core`, `monetization-core` (7 vitest tests), `media-core`
- NestJS API (`apps/api`): auth, catalog, curriculum/lessons+access, commerce (mock/Stripe/VNPay adapters), rewards (SSV + `dev/complete`), progress/library, teacher, admin, media stubs, remote-config
- Next.js unified web (`apps/web`): catalog, product buy, learn + rewarded unlock UI, library, teacher, admin, login
- Expo student shell (`apps/mobile-student`): catalog, login, product buy, library
- Workers stub (`apps/workers`): BullMQ queues for entitlement/webhook jobs

## Verified locally

- `GET /api/v1/health` → ok
- Student login → JWT
- Paid lesson before purchase → access gate
- Mock checkout → fulfill entitlements
- Monetization-core unit tests → 7/7 pass
- `next build` (NODE_ENV=production) → success

## Intentionally deferred (post-MVP)

- Live Stripe/VNPay credentials + production webhook hardening
- Full AdMob ECDSA SSV verification (`ADMOB_SSV_ENFORCE=true`)
- AWS S3 + MediaConvert pipeline (D6)
- Separate storefront/teacher/admin Next apps (unified web for MVP)
- Quizzes/certificates polished UI
- Affiliate, AI assistants, marketplace revenue split (schema-ready, D4 off)
- Production mobile builds / store listing

## Run notes

- Prefer `tsc` + `node dist/main.js` for API (Nest DI needs emitDecoratorMetadata)
- Docker Compose exists but this environment used apt PostgreSQL/Redis
- Dev reward completion: `POST /api/v1/rewards/dev/complete` — **not for production**
