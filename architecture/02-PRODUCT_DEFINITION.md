# 2. Product Definition

## Product statement

**Education Commerce Platform** enables creators and operators to package educational content as commerce products, sell access, and deliver learning experiences across web and mobile — with flexible monetization including free, purchase, subscription, bundle, and rewarded ads.

## Problem

Independent education businesses need:

- Commerce (checkout, refunds, coupons, bundles)
- Learning delivery (video, docs, progress, quiz, certificates)
- Access control that can change without rewriting apps
- Multi-surface consistency (web + mobile)
- Room to grow into marketplace / multi-app brands

Building a one-off “course app” creates irreversible coupling.

## Solution shape

Four client experiences + one Platform Core:

1. **Public Storefront** — discovery, pricing, SEO, checkout entry
2. **Student Platform** — learning, library, progress, certificates
3. **Teacher Platform** — authoring, students, revenue (scoped)
4. **Admin Platform** — catalog, commerce, users, config, audit

## Product types (catalog — extensible)

| Type | Description |
|------|-------------|
| `VIDEO_COURSE` | Structured video learning product |
| `DIGITAL_DOCUMENT` | Downloadable/viewable document product |
| `COURSE_BUNDLE` | Bundle of courses |
| `DOCUMENT_BUNDLE` | Bundle of documents |
| `MIXED_BUNDLE` | Mixed digital products |
| `SUBSCRIPTION` | Time-bounded library/access plan |
| `PREMIUM_LIBRARY` | Catalog-wide access product |
| `CERTIFICATE_PRODUCT` | Optional paid certificate issuance |
| `OTHER_DIGITAL_PRODUCT` | Extensibility bucket |

UI must load types from catalog/config — not switch on hard-coded enums alone for rendering of price/access.

## Monetization modes (per app config)

FREE · ADS · REWARDED_ADS · ONE_TIME · BUNDLE · SUBSCRIPTION · COUPON · PROMOTION · AFFILIATE

Not every app enables every mode.

## Non-functional product requirements

- Mobile-first student UX
- Clear Free / Premium / Buy / Watch Ad / Locked states (no dark patterns)
- Sub-second navigation for catalog lists (pagination + cache)
- Secure media delivery for paid content
- Operational auditability for money and entitlements

## Out of scope for MVP product

Advanced community social graph, ML recommendations, full AI tutor, gift purchasing, white-label enterprise SSO — see Feature Map FUTURE/COULD.
