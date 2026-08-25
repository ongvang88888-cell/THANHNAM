# Architecture Overview

## Purpose

Build a **platform** for education commerce: video courses, digital documents, bundles, subscriptions, free previews, and rewarded-ad unlocks — with Student, Teacher, Admin, and Public Storefront clients sharing one backend authority.

## North-star principles

1. **Build once — reuse everywhere.** Shared Core is never copied into apps.
2. **Server is authority.** Entitlements and access decisions never come from the client.
3. **Provider behind adapters.** Payments, ads, storage, video, AI, push — all swappable.
4. **Product types are data.** UI never hard-codes a closed set of product types.
5. **Idempotent money & rights.** Orders, payments, entitlements, rewards must be replay-safe.
6. **Correctness before speed.** Prefer slower delivery over insecure or unmaintainable shortcuts.

## Recommended technical baseline (MVP → scale)

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Monorepo | pnpm + Turborepo | Shared packages, typed boundaries |
| Language | TypeScript (strict) | End-to-end contracts |
| API | NestJS modular monolith | Clear modules, extractable later |
| DB | PostgreSQL 16 | ACID for commerce/entitlements |
| ORM/Migrations | Prisma | Typed schema + migrations |
| Cache | Redis | Sessions, rate limits, hot config |
| Queue | BullMQ (Redis) | Media, email, webhooks, rewards |
| Search MVP | Postgres FTS | Simple; OpenSearch later |
| Object storage | S3-compatible via `IStorageProvider` | Multi-cloud |
| CDN | CloudFront / Cloudflare / equivalent | Signed URLs |
| Web | Next.js App Router | Student / Teacher / Admin / Storefront |
| Mobile | Expo React Native (pending D1) | Shared TS domain types |
| Auth | JWT access + rotating refresh | Stateless API + revoke via session store |
| Observability | OpenTelemetry + structured logs | Ops readiness |

> Convex / Firebase-style BaaS is **not** the system of record for orders/entitlements in this design. Reactive UX can subscribe to API events later; money and rights stay in PostgreSQL transactions.

## Logical architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Clients: Storefront │ Student │ Teacher │ Admin │ Mobile     │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTPS / JWT
┌────────────────────────────▼────────────────────────────────┐
│ API Gateway / Edge (TLS, WAF, rate limit, CORS)              │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│ Modular Monolith API                                        │
│  Identity │ Catalog │ Course │ Media │ Commerce │ Access    │
│  Reward │ Progress │ Quiz │ Cert │ Notify │ Analytics │ AI  │
└───┬──────────┬──────────┬──────────┬──────────┬─────────────┘
    │          │          │          │          │
 PostgreSQL   Redis     Queue     Object+CDN   Providers
 (SoR)      (cache)   workers    (private)   (Pay/Ads/AI)
```

## Dependency rule

```
App shells
   ↓ depends on
Education Core / Monetization Core / Media Core
   ↓ depends on
Shared Core
   ↓ depends on
Platform primitives (DB, Redis, queue, storage interfaces)
```

**Forbidden:** App → duplicate Payment/Auth; Media → call Monetization internals; Shared Core → depend on Education.

## Multi-app model

Every request is scoped by `app_id` (and optionally `org_id` for marketplace/orgs).

| Field | Use |
|-------|-----|
| `app_id` | Brand / binary / store listing |
| `enabled_modules` | Feature availability |
| `monetization_config` | Ads, purchase, subscription toggles |
| `branding` | Theme, logo, domain |

App #2 = configuration + thin shell, not a fork.

## Content Access Engine (summary)

Every content node has an **AccessPolicy**. Evaluation order (illustrative):

1. Admin grant / staff bypass
2. Explicit entitlement (purchase, bundle, subscription, reward, coupon)
3. Free / preview policy
4. Rewarded-ad eligibility
5. Prerequisite / drip / time lock
6. Deny with structured reason (`NEEDS_PURCHASE`, `NEEDS_AD`, …)

Clients render UX from **decision codes**, never invent access.

## Reliability patterns

- Outbox / idempotency keys for payments & entitlements
- Webhook dedupe by provider event id
- Queue retries with DLQ
- Circuit breakers for AI/analytics/notification (non-critical path)
- Signed short-lived media URLs

## Related docs

- [DOMAIN_MODEL.md](./DOMAIN_MODEL.md)
- [DATABASE.md](./DATABASE.md)
- [ENTITLEMENT.md](./ENTITLEMENT.md)
- [PAYMENT.md](./PAYMENT.md)
- [REWARDED_ACCESS.md](./REWARDED_ACCESS.md)
- [SECURITY.md](./SECURITY.md)
- [DEPLOYMENT.md](./DEPLOYMENT.md)
- [NEW_APP.md](./NEW_APP.md)
