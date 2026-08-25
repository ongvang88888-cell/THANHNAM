# 38. Scalability Plan

## Expected growth stages

| Stage | Users | Strategy |
|-------|-------|----------|
| 0–10k MAU | Single region modular monolith | Vertical + CDN |
| 10k–100k | Read replicas; split media workers; cache access decisions | Queue isolation |
| 100k+ | Extract payment webhook service; search engine; multi-CDN | Consider cell architecture per app |

## Hot paths to optimize first

1. `evaluateAccess` + entitlement lookup (indexes + cache)
2. Catalog listing (pagination + cache)
3. Playback URL signing
4. Progress heartbeats (batch writes)

## What not to do early

- Sharding PostgreSQL before metrics
- Event-sourcing entire domain
- Per-microservice databases on day one

## Multi-app isolation

`app_id` on rows + rate limits per app; noisy-neighbor quotas later.
