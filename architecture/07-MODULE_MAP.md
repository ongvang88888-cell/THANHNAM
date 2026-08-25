# 7. Module Map

## Packages (monorepo)

| Package | Responsibility |
|---------|----------------|
| `@edu/shared-core` | Auth contracts, RBAC primitives, errors, logging, config, API client, feature flags |
| `@edu/education-core` | Curriculum, progress, quiz, certificates, teacher/student domain services |
| `@edu/monetization-core` | Catalog, orders, payments, entitlements, access engine, rewards, affiliates |
| `@edu/media-core` | Video/docs pipelines, signed URLs, storage adapters |
| `@edu/design-system` | UI tokens/components |
| `@edu/api` | NestJS host composing modules |
| `@edu/workers` | Queue consumers (media, email, webhooks, analytics sink) |

## Apps

| App | Notes |
|-----|-------|
| `storefront-web` | Public marketing + catalog + checkout entry |
| `student-web` | Learning experience |
| `teacher-web` | Creator portal |
| `admin-web` | Operations |
| `mobile-student` | Expo app |

## NestJS modules (API)

`IdentityModule` · `CatalogModule` · `CurriculumModule` · `MediaModule` · `CommerceModule` · `EntitlementModule` · `AccessModule` · `RewardModule` · `SubscriptionModule` · `ProgressModule` · `QuizModule` · `CertificateModule` · `NotificationModule` · `AnalyticsModule` · `AffiliateModule` · `AiModule` · `AdminModule` · `ConfigModule`

Each module owns its tables via repository interfaces; cross-module calls go through application services / domain events — not table peeking.
