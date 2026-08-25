# Implementation status (Phase 5+)

Last updated: 2026-08-25 (P1 Play Billing + refunds)

## P1 Google Play / mobile / refunds (current)

See **`docs/P1_RUNBOOK.md`**.

- Google Play Billing adapter (`google_play`) + `POST /payments/google-play/confirm`
- Platform checkout policy (Android → Play/mock; Web → mock/stripe/vnpay)
- Admin refund + entitlement **REVOKED** (`POST /orders/:id/refund`)
- Mobile student: Mock/Play checkout (dev `gp_test_*`), library/docs/learn, `eas.json`
- MediaConvert SigV4 CreateJob + `POST /media/webhooks/mediaconvert`
- Seed `metadataJson.playSku` on course/doc products

## P0 web commerce

See **`docs/P0_RUNBOOK.md`**.

- Teacher: create course / document / bundle, upload video+doc, submit review
- Admin: review queue + publish
- Catalog: bundle children expanded
- Checkout: mock auto-fulfill, Stripe/VNPay adapters, `GET /orders/:id`, return page
- Media: memory HTTP local store (or S3), video complete + playback, document content
- Web: provider selector, library type links, learn video player, document download

## Done in earlier completion pass

- **AdMob SSV**: ECDSA verification via `verifyAdmobSsvSignature` (`ADMOB_SSV_ENFORCE=true` for production)
- **Stripe webhook HMAC** verification when `STRIPE_WEBHOOK_SECRET` set
- **S3/MinIO storage** + MediaConvert adapter factories (`createStorageFromEnv` / `createTranscodeFromEnv`)
- **Quiz API + UI**: server-side scoring, seed quiz, `/quizzes/*`, web quiz page
- **Certificates**: public verify page `/verify/certificate/[publicId]`
- **Notifications**: list + mark read; purchase/reward create in-app notifications
- **Analytics**: `POST /analytics/events`
- **Reviews**: product reviews (purchasers only)
- **Subscriptions**: `POST /subscriptions/start` + entitlement grant (MVP mock activate)
- **Workers**: BullMQ entitlement expiry (every 5m) + media/webhook queues
- **Mobile**: learn screen + reward unlock flow
- **Tests**: monetization 15 (incl. payment policy) + education quiz

## Verified (P1 smoke)

- Health OK
- `stripe` on `android` → 400 policy reject; `google_play` on `web` → 400
- Play checkout → `play_billing` SKU → confirm `gp_test_*` → **FULFILLED**
- Admin refund → order/payment **REFUNDED**, entitlements **REVOKED**
- MediaConvert webhook accepts EventBridge-shaped payload

## Still needs your credentials / ops (cannot fake in this VM)

| Item | What you provide |
|------|------------------|
| Stripe live | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| VNPay live | `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET` |
| Google Play | Play Console SKUs + `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` |
| AdMob enforce | Set `ADMOB_SSV_ENFORCE=true` + real SSV callbacks |
| AWS S3 / MediaConvert | Real AWS keys, bucket, `MEDIACONVERT_*` |
| Aikido SAST | Sign in MCP (see agent message for URLs) |
| GitHub remote | Push branch from a checkout with repo access |
| Store builds | EAS project ID / Play / App Store accounts |

## Deferred (next after P1)

- Apple IAP adapter (policy already lists `apple_iap`)
- Native Play Billing in EAS/dev-client (not Expo Go)
- Marketplace revenue split (D4 off)
- Full affiliate payouts, AI generation UX
- MoMo/ZaloPay adapters
