# P2 — Apple IAP + store billing hardening

P1 shipped Google Play + refunds. P2 completes **store-policy digital unlocks** (D3): Apple IAP, shared confirm pipeline, token/SKU guards, RTDN/ASN webhooks, and a mobile IAP façade ready for EAS.

## What shipped

| Area | Detail |
|------|--------|
| Policy | `PaymentPolicyConfig` — iOS → `apple_iap`/`mock`; Android → Play; Web → Stripe/VNPay/mock |
| Apple IAP | Provider + `POST /payments/apple-iap/confirm` + ASN V2 `signedPayload` webhook |
| App Account Token | UUID in intent `clientAction.appAccountToken` (StoreKit correlation) |
| SKU bind | `expectedSku` on payment; confirm/webhook reject SKU mismatch |
| Token reuse | Same Play token / Apple `transactionId` cannot fulfill two orders (409) |
| Play RTDN | Pub/Sub `{ message.data }` base64 envelope + one-time/subscription cancel types |
| Mobile | `src/lib/iap.ts` façade; product screen Mock / Play / Apple |
| Seed | `playSku` + `appleSku` on course/doc products |

## Apple App Store Connect checklist

1. Create IAP products matching `appleSku` (e.g. `typescript_fundamentals`)
2. Create App Store Connect API key (In-App Purchase) → set:
   - `APPLE_IAP_BUNDLE_ID`
   - `APPLE_IAP_ISSUER_ID`
   - `APPLE_IAP_KEY_ID`
   - `APPLE_IAP_PRIVATE_KEY` (`.p8`, `\n` escaped OK)
3. `APPLE_IAP_USE_SANDBOX=true` for TestFlight / sandbox
4. Wire App Store Server Notifications V2 → `POST /api/v1/payments/webhooks/apple_iap`
5. EAS iOS build: set `EXPO_PUBLIC_NATIVE_IAP=1` and implement `purchaseNative` with StoreKit 2 / `react-native-iap`

### Dev verify without App Store

```bash
TOKEN=...   # student JWT
PRODUCT=... # product id

# checkout
curl -s -X POST "$API/checkout/sessions" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -H "X-App-Id: education_app" \
  -d "{\"productId\":\"$PRODUCT\",\"provider\":\"apple_iap\",\"platform\":\"ios\",\"idempotencyKey\":\"p2-apple-$(date +%s)\"}"

ORDER=...
curl -s -X POST "$API/payments/apple-iap/confirm" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -H "X-App-Id: education_app" \
  -d "{\"orderId\":\"$ORDER\",\"transactionId\":\"iap_test_$ORDER\",\"productId\":\"typescript_fundamentals\"}"
```

Set `APPLE_IAP_ALLOW_TEST_TOKENS=false` in production.

## Security invariants (do not regress)

1. **Webhook / confirm is authoritative** — never grant entitlement from client “paid” alone
2. **Idempotent fulfill** via `Transaction.providerEventId` unique
3. **Token reuse blocked** across orders
4. **SKU must match** checkout `expectedSku` when store returns a product id
5. **Platform policy** — no Stripe on iOS/Android digital unlocks; no Play on iOS; no Apple on Android/Web

## Mobile native wiring (EAS)

```ts
// apps/mobile-student/src/lib/iap.ts → purchaseNative
// 1. pnpm add react-native-iap (dev client / prebuild)
// 2. EXPO_PUBLIC_NATIVE_IAP=1
// 3. requestPurchase({ sku, appAccountToken }) → return transactionId / purchaseToken
```

Expo Go remains on `gp_test_*` / `iap_test_*` bridges for entitlement QA.

## Out of P2

- Marketplace revenue split (D4 off)
- MoMo / ZaloPay
- Full Apple JWS root-certificate chain verify (API lookup is the production source of truth when keys are set)
- Affiliate commission reverse on refund
