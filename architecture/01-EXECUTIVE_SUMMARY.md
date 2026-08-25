# 1. Executive Summary

## What we are building

An **Education Commerce Platform** — not a single course app. It sells and delivers:

- Video courses
- Digital documents
- Bundles/combos
- Optional subscriptions / premium libraries
- Free preview content
- Rewarded-ad temporary unlocks

Surfaces: **Student**, **Teacher**, **Admin**, **Public Storefront** on Web + Mobile, one backend.

## Why architecture-first

Monetization + entitlement + media protection mistakes are expensive to reverse. Per Master Spec BC, **no implementation until this package is accepted**.

## Differentiation vs typical LMS demos

| Typical demo | This platform |
|--------------|---------------|
| `if (premium)` gates | Policy + Entitlement engine |
| Hard-coded course | Catalog of typed products |
| Direct S3 video URLs | Signed, entitled playback |
| Client-trusted ads | AdMob SSV + server grant |
| One app fork | Multi-app Shared Core |

## Success criteria (platform-level)

1. Sell course/document/bundle with correct entitlement issuance (idempotent).
2. Free / paid / rewarded states are explicit in UX and enforced server-side.
3. Teachers manage own content without seeing others’ private data.
4. Admins operate catalog, commerce, rewards, users, config.
5. Second app can launch by configuration + shell, without rewriting Core.
6. Payment / ads / storage / AI providers are replaceable via adapters.

## Delivery strategy

- **Modular monolith** for MVP correctness and speed of integration testing
- **Bounded contexts** mapped to NestJS modules / packages
- Extract workers (media, webhooks) first when scale demands
- Semantic versioning for public APIs and Shared Core

## Biggest risks (abbreviated)

1. Store billing policy mismatch (Play / App Store) — mitigate with Payment Policy Config
2. Reward fraud — mitigate with SSV + quotas + anti-replay
3. Content leakage via long-lived URLs — mitigate with short TTL signed URLs + audit
4. Premature microservices — mitigate with modular monolith until metrics force split

## Ask of stakeholders

Confirm Open Decisions D1–D5 in `ARCHITECTURE_PACKAGE.md`, then authorize Phase 5 (Shared Core implementation).
