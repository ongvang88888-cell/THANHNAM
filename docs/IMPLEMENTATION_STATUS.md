# Implementation status

Last updated: 2026-08-26 (stability / publish-readiness slice)

## Shipped in this slice

- ZaloPay webhook MAC is strict when KEY1/KEY2 is set
- Lesson comments require CAN_ACCESS
- Progress updates preserve omitted video/time fields
- Admin grant is scoped to the same `appId`
- Auth refresh/reset/verify/resend are throttled
- Production boot requires `CORS_ORIGINS` + payment secret for the default rail
- Subscription checkout idempotency is stable (`sub-{user}-{product}`)
- MediaConvert webhook authenticates with `MEDIA_WEBHOOK_SECRET`
- Affiliate payout status is validated
- Web: post-login `?next=`, verify-email once, library continue, empty-curriculum link hidden, load errors surfaced
- Mobile: `/auth/me` on boot, buy → login, documents open via system URL

## Previous go-live slice

- Production runtime gates (mock payments, JWT, CORS, storage, SSV, IAP test tokens)
- Auth: verify email, forgot/reset, lockout, GDPR export/delete, live session/roles
- Paid subscriptions (no free activate); VN-only providers in production
- Invoice/VAT records + receipt email
- Cron jobs (expire, abandoned, idle)
- Signed local media
- Teacher drip/prereq/quiz authoring APIs + UI (drip/prereq patch does **not** wipe existing video contents)
- Web: register/reset/refresh, role-aware nav, checkout poll, Stripe confirm, learning extras, invoices/wishlist/certificates/account, affiliate payouts, admin ops
- Mobile: SecureStore, register, forgot/reset, JWT refresh, expo-av player, progress
- CI (API/web/mobile typecheck + unit tests + API build) + Dockerfiles + `docker-compose.prod.yml` + `docs/GO_LIVE.md`

## P4 (previous)

See `architecture/DECISIONS_P4.md` + `docs/P4_RUNBOOK.md`.

- ICP: creator owned school
- A: flash campaigns, aff cookie + real payouts, abandoned checkout
- B: drip/prereq, idle nudges, announcements + lesson comments

## Locked out of scope

- Marketplace revenue split (D4 OFF)
- Full GDT e-invoice provider
- Live AWS/ECS/RDS (compose/docs only)
- Live Play + Apple store credentials
