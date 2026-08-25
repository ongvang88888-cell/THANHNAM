# Locked Decisions — P4 Growth + Retention

**Status:** DECIDED  
**Date:** 2026-08-25  
**Authority:** Stakeholder confirmation + agent default picks where requested  

| ID | Decision | Locked value | Notes |
|----|----------|--------------|-------|
| **P4-1** | Package | **A + B** | Growth Commerce + Learning Retention. Subscription **after** A (not in first P4 slice). |
| **P4-2** | ICP (6 months) | **Creator bán lẻ (owned school)** | Agent pick. Fits stack + D4 OFF. Marketplace & B2B LMS deferred. |
| **P4-3** | Affiliate payout | **Ledger + real money** | REQUESTED → APPROVED → PAID (manual bank transfer admin). Reverse on refund still applies to commissions. |
| **P4-4** | Subscription billing | **VN gateways only** | When built: MoMo/ZaloPay/VNPay renew flows — **not** Stripe-first for VN membership. Deferred until after P4-A core. |
| **P4-5** | Community | **Announcements + lesson comments (Q&A tối giản)** | Agent pick. No social graph / DMs / cohort live calendar in P4. |
| **P4-6** | Marketplace split | **Still OFF (D4)** | Unchanged. |
| **P4-7** | Attribution | **Last-click, 30-day window** | Cookie/visitorKey + bind on login/checkout (Unica-style). |

## Why ICP = creator school (not marketplace / B2B)

- Product already: entitlements, teacher authoring, multi-app `app_id`, VN + store payments — classic **Teachable/Thinkific** shape.
- Marketplace needs D4 split + supply QA + price wars (Unica) — premature.
- B2B LMS (Gitiho paths/assign) is a different buyer — defer until B2C creator GMV proves out.

## Why community = announcements + lesson comments

- Ruzuku-style data: discussion correlates with much higher completion.
- Full community/cohort is heavy ops; **per-lesson thread + course announcements** captures most retention value for P4-B.

## P4 delivery order

1. **P4-A:** Campaign/flash → Aff attribution window + payout → Abandoned checkout nudge → (bump/recommend polish if time)
2. **P4-B:** Drip + prerequisites → Idle reminders → Announcements + lesson comments
3. **After A+B:** Subscription live on **VN gateways only** (separate lock/amendment)

## Change control

Changing P4-1…P4-7 requires an architecture amendment note.
