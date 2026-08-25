# P0 Web Commerce Runbook

P0 = sell **video courses**, **digital documents**, and **bundles** on web with stable checkout, entitlements, teacher upload, and admin publish.

## Local stack

```bash
# DB must be up (Postgres). Then:
export $(grep -v '^#' .env | xargs)
pnpm db:generate
pnpm db:push
pnpm db:seed

# API (prefer tsc + node — avoids Nest DI issues with tsx)
cd apps/api && pnpm exec tsc -p tsconfig.json && node dist/main.js

# Web
cd apps/web && NEXT_PUBLIC_API_URL=http://127.0.0.1:3001/api/v1 pnpm dev
```

Accounts (password `Password123!`):

| Role | Email |
|------|--------|
| Admin | admin@edu.local |
| Teacher | teacher@edu.local |
| Student | student@edu.local |

Header: `X-App-Id: education_app`

## P0 happy paths

### Student buy (mock)

1. Login as student → open product → provider **Mock** → Buy
2. API auto-fulfills → `/checkout/return?orderId=…` → status `FULFILLED`
3. Library shows owned product (document → download page, course → learn)

### Stripe / VNPay

| Provider | Required env | Web behavior |
|----------|--------------|--------------|
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Creates PaymentIntent; webhook `POST /api/v1/payments/webhooks/stripe` fulfills |
| VNPay | `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET` | Redirect to sandbox; IPN/return → webhook `…/vnpay` |

Without keys: Stripe returns test stub (non-prod); VNPay builds demo signed URL. Production refuses missing secrets.

### Teacher publish flow

1. Teacher → create course / document / bundle
2. Upload tab → video or PDF → complete
3. Attach video to course curriculum (`videoId`)
4. Submit product → status `IN_REVIEW`
5. Admin → Review queue → Publish

### Media (local)

- Default: `STORAGE_DRIVER=memory` + `GET/PUT /api/v1/media/local?key=…`
- Production: set S3/MinIO (`S3_ENDPOINT`, keys, bucket) and unset `STORAGE_DRIVER` (or leave empty)
- Playback / document content are entitlement-gated

## Ops checklist before real money

- [ ] `NODE_ENV=production` with real JWT secrets
- [ ] Stripe live/test keys + webhook endpoint registered
- [ ] VNPay merchant credentials + return URL allowlisted
- [ ] S3 private bucket + CORS for upload PUT
- [ ] MediaConvert (or worker) for real HLS — optional after P0
- [ ] HTTPS on API + web
- [ ] Backup Postgres; no secrets in git

## Smoke commands

```bash
# health
curl -s http://127.0.0.1:3001/api/v1/health

# login + catalog + mock checkout
TOKEN=$(curl -s -X POST http://127.0.0.1:3001/api/v1/auth/login \
  -H 'Content-Type: application/json' -H 'X-App-Id: education_app' \
  -d '{"email":"student@edu.local","password":"Password123!"}' | jq -r .accessToken)
curl -s http://127.0.0.1:3001/api/v1/products -H "X-App-Id: education_app" | jq '.items|length'
```

## Out of P0 (later)

- Google Play Billing / EAS mobile store
- Real MediaConvert CreateJob + CDN playback
- Refunds / entitlement revoke UI
- Marketplace split (D4 off)
