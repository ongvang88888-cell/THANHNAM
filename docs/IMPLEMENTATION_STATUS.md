# Implementation status (Phase 5+)

Last updated: 2026-08-25 (P0 web commerce)

## P0 web commerce (current)

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
- **Tests**: monetization 7 + education quiz 2

## Verified

- Health, checkout fulfill, quiz submit score 100, notifications > 0
- `next build` success (quiz/notifications/certificate routes)
- Workers boot + expire job

## Still needs your credentials / ops (cannot fake in this VM)

| Item | What you provide |
|------|------------------|
| Stripe live | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| VNPay live | `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET` |
| AdMob enforce | Set `ADMOB_SSV_ENFORCE=true` + real SSV callbacks |
| AWS S3 / MediaConvert | Real AWS keys, bucket, `MEDIACONVERT_*` |
| Aikido SAST | Sign in MCP (see agent message for URLs) |
| GitHub remote | Push branch from a checkout with repo access |
| Store builds | EAS / Play / App Store accounts |

## Deferred by product decision (not MVP blockers)

- Marketplace revenue split (D4 off)
- Full affiliate payouts, AI generation UX
- Separate Next apps per surface (unified `apps/web` is intentional for MVP)
- MoMo/ZaloPay adapters
- Google Play Billing (P1 after P0 web revenue path)
