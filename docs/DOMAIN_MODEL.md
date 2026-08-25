# Domain Model

## Bounded contexts

1. **Identity** — users, roles, sessions, devices
2. **Catalog** — products, prices, categories, tags
3. **Curriculum** — courses, sections, lessons, contents
4. **Media** — videos, documents, processing jobs
5. **Commerce** — carts/orders, payments, refunds
6. **Entitlement & Access** — entitlements, policies, decisions
7. **Rewards** — reward policies, transactions, grants
8. **Subscription** — plans, cycles, events
9. **Learning** — progress, bookmarks, notes, sessions
10. **Assessment** — quizzes, attempts, assignments
11. **Credentialing** — certificates
12. **Growth** — affiliates, reviews, notifications, analytics
13. **Platform** — apps, remote config, feature flags, audit

## Aggregate roots (selected)

| Aggregate | Invariants |
|-----------|------------|
| `User` | Unique email per app/org policy; credentials hashed |
| `Product` | Type valid; published only with price & linked resource |
| `Course` | Ordered sections; lessons belong to one section |
| `Order` | Immutable line items after payment attempt; status machine |
| `Payment` | Idempotent by `idempotency_key` / provider_ref |
| `Entitlement` | One active grant key per (user, resource, source_ref) |
| `RewardTransaction` | Unique provider `transaction_id`; verified before grant |
| `Subscription` | At most one active per (user, plan) unless configured |
| `VideoAsset` | Playback only when processing `READY` |
| `Certificate` | Unique public id; issued only if completion rules pass |

## Key entities & relationships

```
App 1──* User
App 1──* Product
Product 1──1 Course | Document | Bundle | SubscriptionPlan (by type)
Course 1──* Section 1──* Lesson 1──* LessonContent
Lesson 1──1 AccessPolicy (or inherit)
User 1──* Order 1──* OrderItem *──1 Product
Order 1──* Payment 1──* Transaction
User 1──* Entitlement *──1 Resource(ref)
User 1──* RewardTransaction → Entitlement(grant)
User 1──* CourseProgress / LessonProgress
Course 1──* Quiz / CertificateTemplate
```

## Access decision (value object)

```ts
type AccessDecision =
  | { code: 'CAN_ACCESS'; reasons: string[]; expiresAt?: string }
  | { code: 'CANNOT_ACCESS'; reasons: string[] }
  | { code: 'NEEDS_PURCHASE'; productIds: string[] }
  | { code: 'NEEDS_AD'; rewardPolicyId: string }
  | { code: 'NEEDS_PREREQUISITE'; lessonIds: string[] }
  | { code: 'EXPIRED'; expiredAt: string };
```

## Entitlement resource types

`course` · `lesson` · `document` · `bundle` · `subscription` · `library` · `certificate` · custom via registry

## Money

Store amounts as **integer minor units** + ISO currency. Never float.

## Soft deletes

Prefer `status` / `deleted_at` for catalog; hard-delete only anonymized GDPR flows with audit.

## Event vocabulary (domain events)

`OrderPaid` · `EntitlementGranted` · `EntitlementRevoked` · `RewardVerified` · `VideoReady` · `CourseCompleted` · `CertificateIssued` · `SubscriptionRenewed` · `RefundCompleted`
