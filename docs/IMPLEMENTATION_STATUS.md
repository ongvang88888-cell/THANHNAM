# Implementation status (Phase 5+)

Last updated: 2026-08-25 (P3 commerce stability)

## P3 commerce money-path stability (current)

See **`docs/P3_RUNBOOK.md`**.

- Order row lock (`FOR UPDATE`) on fulfill + refund
- Refund idempotency via `Transaction` REFUND + `providerEventId`
- Full-refund-only for digital entitlements
- Stable SHA-256 store confirm event ids
- Fulfill no longer marks order FAILED on non-SUCCEEDED events
- Pure helpers + unit tests in `@edu/monetization-core` (`money-stability`)

## P2 Apple IAP + store hardening

See **`docs/P2_RUNBOOK.md`**.

## P1 Google Play / refunds / MediaConvert

See **`docs/P1_RUNBOOK.md`**.

## P0 web commerce

See **`docs/P0_RUNBOOK.md`**.

## Deferred after P3

- MoMo / ZaloPay adapters
- Affiliate commission ledger + reverse-on-refund
- Marketplace revenue split (D4 off)
- Coupon apply on checkout (schema ready)
- EAS native IAP (`EXPO_PUBLIC_NATIVE_IAP=1` + react-native-iap)
