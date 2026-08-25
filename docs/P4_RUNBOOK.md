# P4 Growth + Retention — runbook

Locked in `architecture/DECISIONS_P4.md`.

## ICP (agent pick, locked)

**Creator bán lẻ (owned school)** — not marketplace, not B2B LMS for 6 months.

## Community (agent pick, locked)

**Course announcements + lesson comments** (no social graph).

## Shipped in this slice

| Area | API / behavior |
|------|----------------|
| Flash campaigns | `GET /campaigns/active`, `POST /admin/campaigns`; auto max(discount) on checkout |
| Aff attribution | `POST /affiliate/track` + `visitorKey` on checkout; 30-day last-click |
| Aff payout (real money) | `POST /affiliate/payouts`, admin `.../resolve` → APPROVED/PAID/REJECTED |
| Abandoned checkout | `POST /admin/jobs/abandoned-checkout` |
| Idle learning nudge | `POST /admin/jobs/idle-learning` |
| Drip + prereq | Lesson `dripDaysAfterPurchase` / `dripUnlockAt` / `prerequisiteLessonId` via Access Engine |
| Announcements | `GET/POST /courses/:id/announcements` |
| Lesson comments | `GET/POST /lessons/:id/comments` |

## Deferred (locked after A+B)

- Subscription live on **VN gateways only** (P4-4)
- Marketplace split still OFF (D4)

## Seed

- Campaign `flash-welcome` 15% on TypeScript product
- Paid lesson: prereq = preview, drip = 1 day after purchase
- Sample course announcement

## Smoke hints

```bash
BASE=http://127.0.0.1:3001/api/v1
H='X-App-Id: education_app'

# track ref
curl -X POST $BASE/affiliate/track -H "$H" -H 'Content-Type: application/json' \
  -d '{"code":"TEACHERREF","visitorKey":"vk_demo_1"}'

# payout: REQUESTED → APPROVED → PAID
curl -X POST $BASE/affiliate/payouts -H "Authorization: Bearer $TEACHER" -H "$H" \
  -H 'Content-Type: application/json' \
  -d '{"amountMinor":500000,"bankInfoJson":{"bank":"VCB","account":"*1234"}}'
curl -X POST $BASE/admin/affiliate-payouts/$ID/resolve -H "Authorization: Bearer $ADMIN" -H "$H" \
  -H 'Content-Type: application/json' -d '{"status":"APPROVED"}'
curl -X POST $BASE/admin/affiliate-payouts/$ID/resolve -H "Authorization: Bearer $ADMIN" -H "$H" \
  -H 'Content-Type: application/json' -d '{"status":"PAID","adminNote":"BANK-TX-1"}'

# checkout without affiliateCode — visitorKey should attribute
# admin jobs
curl -X POST $BASE/admin/jobs/abandoned-checkout -H "Authorization: Bearer $ADMIN" -H "$H"
curl -X POST $BASE/admin/jobs/idle-learning -H "Authorization: Bearer $ADMIN" -H "$H"
```
