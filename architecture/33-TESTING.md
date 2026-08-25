# 33. Testing Strategy

## Pyramid

1. Unit — policy engine, pricing, entitlement idempotency, SSV signature verify mocks
2. Integration — DB + Redis testcontainers; webhook handlers
3. Contract — OpenAPI / client type compat
4. E2E — critical journeys (purchase, reward unlock, playback authz)
5. Security — authz negative tests, upload abuse, replay attacks
6. Performance — k6 on catalog/access/playback sign endpoints

## Definition of Done gates

Build · tests green · authz covered · no secrets · migrations reviewed · docs updated · no Core duplication

## Test data

Factories per aggregate; never production data in CI.
