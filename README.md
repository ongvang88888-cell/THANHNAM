# Education Commerce Platform

**Status:** Architecture Package complete — **implementation not started** (per Master Spec BC).

A production-grade platform for selling video courses, digital documents, bundles/combos, subscriptions, and rewarded-ad unlocks — with Student, Teacher, Admin, and Public Storefront surfaces on Web and Mobile.

## Current phase

| Phase | Name | Status |
|-------|------|--------|
| 0 | Requirements analysis | Done |
| 1 | Architecture Package | **Done** |
| 2+ | Implementation | **Blocked until Architecture Package accepted** |

## Start here

1. [`ARCHITECTURE_PACKAGE.md`](./ARCHITECTURE_PACKAGE.md) — master index of all 38 deliverables
2. [`docs/DEVELOPMENT_GUIDE.md`](./docs/DEVELOPMENT_GUIDE.md) — how engineers work in this repo
3. [`docs/NEW_APP.md`](./docs/NEW_APP.md) — how to ship app #2 without rewriting Core
4. [`.cursor/rules/`](./.cursor/rules/) — mandatory agent/developer constraints

## Priority order (non-negotiable)

CORRECTNESS → SECURITY → RELIABILITY → MAINTAINABILITY → REUSABILITY → SCALABILITY → PERFORMANCE → DX → SPEED

## What this is not

- Not a single-course demo
- Not an app that hard-codes `if (user.isPremium)`
- Not a copy of Teachable/Thinkific/Kajabi/Moodle UI or code

## Repository layout (planned; packages empty until Phase 5+)

```
apps/                 # student-web, teacher-web, admin-web, storefront, mobile
packages/
  shared-core/        # auth contracts, RBAC, config, logging, errors, API client
  education-core/     # courses, lessons, progress, quiz, certificates
  monetization-core/  # products, orders, payments, entitlements, rewards, affiliates
  media-core/         # video pipeline, documents, signed URLs, storage adapters
docs/                 # canonical documentation
architecture/         # Architecture Package deep dives
.cursor/rules/        # Cursor / agent governance
```

## License / secrets

No secrets in source. Use environment / secret manager only.
