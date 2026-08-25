# Implementation status (Phase 5+)

Last updated: 2026-08-25 (gaps completion: coupons / MoMo / ZaloPay / affiliate / learning)

## Gaps completion (current)

See **`docs/GAPS_COMPLETE_RUNBOOK.md`**.

- Coupon apply on checkout + redemption on fulfill + admin CRUD
- MoMo + ZaloPay web payment adapters (sandbox without live keys)
- Affiliate ledger: PENDING → EARNED on fulfill → REVERSED on refund
- Bookmarks / Notes / Wishlist APIs
- Web checkout: coupon, ref, momo/zalopay
- Native IAP: `EXPO_PUBLIC_NATIVE_IAP=simulate|1`

## P3 commerce money-path stability

See **`docs/P3_RUNBOOK.md`**.

## P2 Apple IAP + store hardening

See **`docs/P2_RUNBOOK.md`**.

## P1 Google Play / refunds / MediaConvert

See **`docs/P1_RUNBOOK.md`**.

## P0 web commerce

See **`docs/P0_RUNBOOK.md`**.

## Explicitly out of scope

- Marketplace revenue split (**D4 OFF**)
- Live Apple/Google/MoMo/ZaloPay/Stripe production credentials (ops)
- Full Apple ASN JWS root-chain verify (API lookup is SoT when keys set)
- EAS project id / real `react-native-iap` binary (use `simulate` until EAS)
