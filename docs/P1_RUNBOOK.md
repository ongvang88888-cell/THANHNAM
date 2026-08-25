# P1 — Google Play Billing + mobile + refunds

After P0 web commerce is solid, P1 adds **in-app digital unlocks on Android (CH Play)**, **refund/revoke**, and **MediaConvert CreateJob** wiring.

## What shipped

| Area | Detail |
|------|--------|
| Play Billing adapter | `google_play` provider · `POST /checkout/sessions` · `POST /payments/google-play/confirm` |
| Store policy | `allowedCheckoutProviders(platform)` — Android → `google_play`/`mock`; Web → stripe/vnpay/mock |
| SKU map | Product `metadataJson.playSku` (seed: `typescript_fundamentals`, `ts_cheat_sheet`) |
| Refunds | `POST /orders/:id/refund` (admin) · revokes entitlements by order item `sourceRef` |
| Mobile | Provider Mock/Play · library/docs · learn playback URL · `eas.json` AAB/APK |
| MediaConvert | SigV4 CreateJob when AWS creds set · `POST /media/webhooks/mediaconvert` |

## Android / CH Play checklist

1. Create Play Console app `com.educommerce.student`
2. Create in-app products matching `playSku` (managed products)
3. Link Play service account → set `GOOGLE_PLAY_PACKAGE_NAME` + `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` on API
4. `npx eas-cli login` · set `extra.eas.projectId` in `app.json`
5. `eas build -p android --profile production` → upload AAB (or `eas submit`)
6. Replace mobile dev `gp_test_*` confirm with **react-native-iap** / Play Billing Library in a **dev client / EAS build** (Expo Go cannot run native IAP)

### Dev verify without Play Console

```bash
# login student, checkout google_play, confirm test token
TOKEN=...
ORDER=...
curl -s -X POST "$API/payments/google-play/confirm" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -H "X-App-Id: education_app" \
  -d "{\"orderId\":\"$ORDER\",\"purchaseToken\":\"gp_test_$ORDER\",\"productId\":\"PRODUCT_ID\"}"
```

Set `GOOGLE_PLAY_ALLOW_TEST_TOKENS=false` in production.

## Refund flow

1. Admin UI → Orders → Refund  
2. Or `POST /api/v1/orders/:id/refund` `{ "reason": "..." }`  
3. Payment → REFUNDED · Order → REFUNDED · Entitlements → REVOKED · in-app notification

## MediaConvert ops

```
MEDIACONVERT_ENDPOINT=https://...mediaconvert...amazonaws.com
MEDIACONVERT_ROLE_ARN=arn:aws:iam::...:role/MediaConvert_Default_Role
MEDIACONVERT_QUEUE_ARN=arn:aws:mediaconvert:...:queues/Default
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET_PRIVATE=...
```

Wire EventBridge/SNS → `POST /api/v1/media/webhooks/mediaconvert` with `userMetadata.videoId`.

Without AWS keys, local path still marks READY on `POST /videos/:id/complete`.

## Env additions

```
GOOGLE_PLAY_PACKAGE_NAME=com.educommerce.student
GOOGLE_PLAY_SERVICE_ACCOUNT_JSON=
GOOGLE_PLAY_ALLOW_TEST_TOKENS=true
MEDIACONVERT_QUEUE_ARN=
```

## Out of P1

- Apple IAP adapter (port ready; policy already lists `apple_iap`)
- Full native IAP UI inside Expo Go
- Marketplace split (D4 off)
