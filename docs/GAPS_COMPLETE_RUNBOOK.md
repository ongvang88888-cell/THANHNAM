# Gaps completion runbook (coupons, MoMo/ZaloPay, affiliate, learning APIs)

Completes deferred items after P3 (except marketplace D4 OFF and live store credentials).

## What shipped

| Area | Behavior |
|------|----------|
| Coupons | `couponCode` on `POST /checkout/sessions`; discount on order + payment; redemption on fulfill |
| Affiliate | `affiliateCode` / `?ref=` on web; PENDING commission at checkout → EARNED on fulfill → REVERSED on refund |
| MoMo / ZaloPay | Web adapters + redirect; sandbox works without live keys |
| Learning | Bookmarks / Notes / Wishlist CRUD |
| Native IAP | `EXPO_PUBLIC_NATIVE_IAP=simulate` or `=1` + optional `react-native-iap` |
| Admin | `GET/POST /admin/coupons`, `GET/POST /admin/affiliates`, `GET /admin/affiliate-commissions` |

## Seed

- Coupon: `WELCOME10` (10% off)
- Affiliate: `TEACHERREF` (teacher owns, 1000 bps = 10%)

## Smoke (API running, header `X-App-Id: education_app`)

```bash
# login student + checkout with coupon + affiliate
TOKEN=... # student JWT
PRODUCT_ID=...

curl -s -X POST localhost:4000/checkout/sessions \
  -H "Authorization: Bearer $TOKEN" -H "X-App-Id: education_app" \
  -H "Content-Type: application/json" \
  -d "{\"productId\":\"$PRODUCT_ID\",\"idempotencyKey\":\"gap-$(date +%s)\",\"provider\":\"mock\",\"platform\":\"web\",\"couponCode\":\"WELCOME10\",\"affiliateCode\":\"TEACHERREF\"}"
```

Expect: `discountMinor` ≈ 10% of list price, order `FULFILLED`, coupon redemption row, affiliate commission `EARNED`.

Refund (admin) → commission `REVERSED`, entitlements `REVOKED`.

## Out of scope (locked)

- Marketplace revenue split (D4 OFF)
- Live Apple/Play/MoMo/ZaloPay production credentials
- Full Apple JWS root-chain verify
