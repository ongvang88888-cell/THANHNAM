# Architecture Package — Education Commerce Platform

**Version:** 0.1.1-architecture  
**Date:** 2026-08-25  
**Status:** COMPLETE — D1–D5 locked; awaiting Phase 5 kickoff authorization  
**Language:** Technical English (product communications may be Vietnamese)

---

## How to use this package

1. Read **§1 Executive Summary** and **§35 MVP Scope**.
2. Read locked decisions: [architecture/DECISIONS_D1_D5.md](./architecture/DECISIONS_D1_D5.md).
3. Approve architectural boundaries if anything still conflicts.
4. Authorize **Phase 5+ implementation** explicitly.

---

## Deliverables index

| # | Deliverable | Location |
|---|-------------|----------|
| 1 | Executive Summary | [architecture/01-EXECUTIVE_SUMMARY.md](./architecture/01-EXECUTIVE_SUMMARY.md) |
| 2 | Product Definition | [architecture/02-PRODUCT_DEFINITION.md](./architecture/02-PRODUCT_DEFINITION.md) |
| 3 | User Roles | [architecture/03-USER_ROLES.md](./architecture/03-USER_ROLES.md) |
| 4 | User Journeys | [architecture/04-USER_JOURNEYS.md](./architecture/04-USER_JOURNEYS.md) |
| 5 | Feature Map (MoSCoW) | [architecture/05-FEATURE_MAP.md](./architecture/05-FEATURE_MAP.md) |
| 6 | Domain Model | [docs/DOMAIN_MODEL.md](./docs/DOMAIN_MODEL.md) |
| 7 | Module Map | [architecture/07-MODULE_MAP.md](./architecture/07-MODULE_MAP.md) |
| 8 | Dependency Graph | [architecture/08-DEPENDENCY_GRAPH.md](./architecture/08-DEPENDENCY_GRAPH.md) |
| 9 | Database ERD | [docs/DATABASE.md](./docs/DATABASE.md#erd) |
| 10 | Database Schema Proposal | [docs/DATABASE.md](./docs/DATABASE.md) |
| 11 | API Architecture | [docs/API.md](./docs/API.md) |
| 12 | Authentication Architecture | [docs/AUTH.md](./docs/AUTH.md) |
| 13 | Entitlement Architecture | [docs/ENTITLEMENT.md](./docs/ENTITLEMENT.md) |
| 14 | Content Access Engine | [docs/ENTITLEMENT.md](./docs/ENTITLEMENT.md#content-access-engine) |
| 15 | Rewarded Ads Architecture | [docs/REWARDED_ACCESS.md](./docs/REWARDED_ACCESS.md) |
| 16 | Payment Architecture | [docs/PAYMENT.md](./docs/PAYMENT.md) |
| 17 | Bundle Architecture | [docs/BUNDLE.md](./docs/BUNDLE.md) |
| 18 | Video Architecture | [docs/VIDEO.md](./docs/VIDEO.md) |
| 19 | Document Architecture | [docs/DOCUMENT.md](./docs/DOCUMENT.md) |
| 20 | Student Architecture | [docs/STUDENT.md](./docs/STUDENT.md) |
| 21 | Teacher Architecture | [docs/TEACHER.md](./docs/TEACHER.md) |
| 22 | Admin Architecture | [docs/ADMIN.md](./docs/ADMIN.md) |
| 23 | Security Architecture | [docs/SECURITY.md](./docs/SECURITY.md) |
| 24 | Analytics Architecture | [docs/ANALYTICS.md](./docs/ANALYTICS.md) |
| 25 | AI Architecture | [docs/AI.md](./docs/AI.md) |
| 26 | Recommendation Architecture | [architecture/26-RECOMMENDATION.md](./architecture/26-RECOMMENDATION.md) |
| 27 | Notification Architecture | [architecture/27-NOTIFICATION.md](./architecture/27-NOTIFICATION.md) |
| 28 | Queue Architecture | [architecture/28-QUEUE.md](./architecture/28-QUEUE.md) |
| 29 | Storage Architecture | [architecture/29-STORAGE.md](./architecture/29-STORAGE.md) |
| 30 | Deployment Architecture | [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) |
| 31 | Backup Strategy | [docs/BACKUP.md](./docs/BACKUP.md) |
| 32 | Disaster Recovery | [docs/DISASTER_RECOVERY.md](./docs/DISASTER_RECOVERY.md) |
| 33 | Testing Strategy | [architecture/33-TESTING.md](./architecture/33-TESTING.md) |
| 34 | Cursor Rules | [`.cursor/rules/`](./.cursor/rules/) |
| 35 | MVP Scope | [architecture/35-MVP_SCOPE.md](./architecture/35-MVP_SCOPE.md) |
| 36 | Future Roadmap | [architecture/36-ROADMAP.md](./architecture/36-ROADMAP.md) |
| 37 | Risk Register | [architecture/37-RISKS.md](./architecture/37-RISKS.md) |
| 38 | Scalability Plan | [architecture/38-SCALABILITY.md](./architecture/38-SCALABILITY.md) |

Canonical overview: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)

---

## Core ownership map (BC requirement)

### Shared Core (build once — reuse everywhere)

- Identity, AuthN, AuthZ/RBAC, sessions, devices
- API client contracts, error model, logging, tracing
- Remote Config + Feature Flags
- Notification channel abstraction
- Analytics event contracts
- Storage abstraction (`IStorageProvider`)
- Design system tokens / UI primitives (web + mobile kits)
- Security utilities (crypto, signed URL helpers, rate-limit interfaces)
- Multi-app registry (`app_id`, branding, module toggles)

### Education Core

- Course / Section / Lesson / Content graph
- Learning progress, bookmarks, notes, learning sessions
- Quiz / assignment domain
- Certificates + public verification
- Teacher course builder domain (not UI)
- Student learning domain (not UI)
- Community abstraction (comments/Q&A stubs)

### Monetization Core

- Product catalog + prices + product types (data-driven)
- Orders, payments, transactions, refunds, invoices
- Entitlements (source of truth for access)
- Access policies + Content Access Engine
- Bundles / combos
- Subscriptions
- Coupons / promotions
- Rewarded access (RewardService, policies, grants, anti-replay)
- Affiliate attribution + commissions
- Payment provider adapters (never business logic)

### Media Core

- Video ingest, processing jobs, renditions, HLS/DASH manifests
- Document versions, MIME validation, preview/download policies
- Signed playback/download URL generation
- Watermarking abstraction
- CDN integration adapters
- Concurrent session / playback limits hooks

### App-specific (only)

- Branding, theme, copy, deep links
- Which modules are enabled
- Monetization config for that app (ads on/off, subscription on/off)
- App store listings / store billing product IDs mapping
- Marketing landing pages unique to the brand
- Optional vertical UX (e.g. kids mode chrome)

### Reusable for App #2 without rewrite

Everything in Shared / Education / Monetization / Media cores. App #2 = new `app` record + branding + module flags + storefront theme.

### Change without Core code

- Prices, coupons, promotions, categories, tags
- Access policy parameters (duration, quotas) via admin/config
- Remote Config: ads_enabled, reward_limit, maintenance_mode, min_version, feature flags
- Content metadata, drip schedules, preview flags
- Commission rates, affiliate campaigns

### Requires code change

- New payment provider adapter
- New ad network adapter / SSV verifier
- New lesson content type renderer
- New entitlement resource type
- Breaking API contract changes
- New Auth method (e.g. SSO/OIDC provider)

---

## Research inputs (patterns only — no UI/code copying)

Product/UX patterns observed across creator LMS platforms and Moodle:

- Product surface is broader than “courses”: digital downloads, memberships, coaching, bundles ([Teachable](https://www.teachable.com/), [Thinkific Pricing](https://www.thinkific.com/pricing/)).
- Bundles, subscriptions/memberships, certificates, quizzes, drip content, coupons, affiliates are standard commerce/LMS capabilities.
- Moodle models learning as **Course → Sections → Activities/Modules** with enrolment + role contexts ([Moodle architecture](https://docs.moodle.org/dev/Moodle_architecture), [AOSA Moodle](https://aosabook.org/en/v2/moodle.html)).
- Rewarded ads must use **server-side verification (SSV)** — never trust client `reward=true` ([AdMob SSV](https://developers.google.com/admob/android/ssv)).

---

## Decisions D1–D5 — LOCKED (2026-08-25)

Canonical record: [architecture/DECISIONS_D1_D5.md](./architecture/DECISIONS_D1_D5.md)

| ID | Locked decision |
|----|-----------------|
| D1 | **Expo React Native** |
| D2 | **AWS** (S3 via `IStorageProvider`; local MinIO) |
| D3 | **Stripe + VNPay** in MVP (MoMo/ZaloPay later); Play/Apple IAP for store apps |
| D4 | **Marketplace revenue split OFF** in MVP (schema-ready) |
| D5 | **Shared PostgreSQL + `app_id`** (+ optional `org_id` later) |
| D6 | **AWS MediaConvert** via `TranscodePort` (follow-on of D2) |
| D7 | **Region `ap-southeast-1`** (follow-on of D2) |

**Rule:** Changing D1–D5 after implementation starts requires an architecture amendment.

---

## Explicit non-goals for Architecture Phase

- No application source code
- No real provider credentials
- No production deployment
- No copying competitor UI

---

## Acceptance checklist

- [x] All 38 package sections authored
- [x] `/docs` set complete per Master Spec BB
- [x] `.cursor/rules` set complete per Master Spec AO
- [x] Core vs App-specific ownership defined
- [x] Ambiguities listed
- [x] D1–D5 locked ([DECISIONS_D1_D5.md](./architecture/DECISIONS_D1_D5.md))
- [x] Stakeholder confirmation of D1–D5
- [ ] Phase 5 kickoff authorized
