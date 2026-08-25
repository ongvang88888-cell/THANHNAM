# Implementation status (Phase 5+)

Last updated: 2026-08-25 (P2 Apple IAP + store hardening)

## P2 Apple IAP + store hardening (current)

See **`docs/P2_RUNBOOK.md`**.

- Apple IAP adapter + `POST /payments/apple-iap/confirm` + ASN V2 webhook
- `PaymentPolicyConfig` (iOS / Android / Web allowlists)
- SKU binding + purchase-token reuse guard (409)
- Play RTDN Pub/Sub envelope parsing
- Mobile `iap.ts` façade (dev bridge + EAS native hook)
- Seed `appleSku` alongside `playSku`

## P1 Google Play / mobile / refunds

See **`docs/P1_RUNBOOK.md`**.

- Google Play Billing adapter + confirm + admin refund/revoke
- MediaConvert SigV4 + webhook

## P0 web commerce

See **`docs/P0_RUNBOOK.md`**.

## Verified (P2 target smoke)

- iOS policy: stripe/google_play rejected; apple_iap checkout → confirm `iap_test_*` → FULFILLED
- Token reuse on second order → 409
- SKU mismatch → 400
- Play Pub/Sub RTDN refund path still maps to revoke

## Still needs credentials / ops

| Item | What you provide |
|------|------------------|
| Apple IAP | App Store Connect API key + IAP products + ASN URL |
| Google Play | Service account + Play Console SKUs |
| Stripe / VNPay | Live keys |
| AWS MediaConvert | Real account wiring |
| EAS | `projectId` + `EXPO_PUBLIC_NATIVE_IAP=1` native module |

## Deferred after P2

- Marketplace revenue split (D4 off)
- MoMo / ZaloPay
- Affiliate commission reverse on refund
- Full Apple JWS root-chain verify (API lookup is production SoT when keys set)
