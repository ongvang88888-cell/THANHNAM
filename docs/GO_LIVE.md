# Go-live checklist

This platform can run a **closed beta / first paying cohort** after the items below are true in the target environment. Marketplace split (D4) stays OFF.

## Must be true in production

1. `NODE_ENV=production`
2. Strong `JWT_ACCESS_SECRET` (≥ 32 chars, not a `change-me` / `dev-access` value)
3. Real `DATABASE_URL` (not local `edu:edu`)
4. `STORAGE_DRIVER` is not `memory` unless `ALLOW_LOCAL_MEDIA=true` (staging only)
5. `ALLOW_MOCK_PAYMENTS` is unset/false — checkout uses VNPay/MoMo/ZaloPay/Stripe
6. `ADMOB_SSV_ENFORCE` or no `ALLOW_DEV_SSV` — `signature=dev` is rejected
7. CORS limited to the real web origin (`CORS_ORIGINS`)
8. SMTP configured (`SMTP_HOST`) so verify/reset/receipt emails leave the box
9. `PUBLIC_WEB_URL` points at the live site
10. Payment provider credentials for the rails you actually sell on

The API refuses to boot when JWT/database/storage secrets look like local defaults.

## What is now implemented

| Area | Behavior |
|------|----------|
| Auth | Register, verify email, forgot/reset, lockout, refresh rotation, export/delete, live session + roles |
| Commerce | Mock blocked in prod; coupon lock; subscription via paid checkout (VN-only in prod); invoice + VAT record + receipt email |
| Learning | Progress, certificates, comments, announcements, notes, bookmarks, wishlist, drip/prereq authoring |
| Media | Signed local URLs; unsigned GET removed |
| Jobs | Cron every 10 minutes: expire entitlements/subs, abandoned checkout, idle nudge |
| Clients | Web register/reset/refresh/role nav/checkout poll/Stripe confirm/affiliate; mobile SecureStore + register + forgot/reset + video |
| Ops | Helmet, CORS, throttle, CI workflow, prod compose |

## Still not “app-store launch”

- Live Apple/Play credentials and store listing
- Full Hóa đơn điện tử GDT provider (printable VAT invoice is the substitute)
- AWS ECS/RDS deploy (docs + compose only)
- Marketplace revenue split (locked OFF)

## Smoke

```bash
pnpm db:generate && pnpm db:push && pnpm db:seed
cd apps/api && pnpm exec tsc -p tsconfig.json && node dist/main.js
# other terminal
cd apps/web && NEXT_PUBLIC_API_URL=http://127.0.0.1:3001/api/v1 pnpm dev
```

Header: `X-App-Id: education_app`

1. Register → verify (dev token in API response / Mailpit) → login → refresh
2. Buy `typescript-fundamentals` with `mock` + `WELCOME10` → invoice appears
3. Open paid lesson after drip/prereq rules
4. Admin refund → entitlement revoked
5. Affiliate payout REQUESTED → APPROVED/PAID
