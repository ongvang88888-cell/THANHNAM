# 4. User Journeys (MVP-critical)

## J1 — Student discovers and buys a course

1. Land on Storefront (web) or Home (mobile)
2. Search/filter → Course detail (price, curriculum, free previews)
3. Start checkout → Payment Provider Adapter
4. Provider webhook + client confirm → Order paid (idempotent)
5. Monetization Core grants entitlements
6. Student opens My Courses → first entitled lesson

**Failure paths:** payment timeout → reconcile via provider status; duplicate webhook → no duplicate entitlement.

## J2 — Free preview lesson

1. Open course → lesson marked `preview` or policy `FREE`
2. Access Engine returns `CAN_ACCESS`
3. Media Core issues short-lived signed URL
4. Progress tracked

## J3 — Rewarded ad unlock

1. Locked lesson shows **Watch Ad** with clear duration/quota copy
2. Client calls `POST /rewards/eligibility`
3. If eligible, client shows rewarded ad (provider SDK)
4. Ad network SSV hits backend → verify signature → grant temporary entitlement
5. Client refreshes access decision → play

**Never:** client posts `rewarded=true` as sole authority.

## J4 — Teacher publishes course

1. Create course draft → sections/lessons
2. Upload video → processing job → ready when renditions exist
3. Set prices / access policies / previews
4. Submit for review
5. Admin approves → product `PUBLISHED`

## J5 — Bundle purchase

1. Storefront shows Bundle ABC
2. Pay once → Order with bundle line item
3. Grant `bundle` entitlement + child product entitlements atomically

## J6 — Subscription access

1. Subscribe to plan
2. Recurring events update subscription status
3. Access Engine accepts active subscription entitlements
4. On cancel/expire → access ends per policy (grace optional)

## J7 — Certificate

1. Course completion criteria met
2. Certificate issued with unique ID + verification URL
3. Public `/verify/certificate/{id}` shows non-sensitive proof

## J8 — Admin refund

1. Admin/support initiates refund
2. Payment adapter refunds
3. Entitlements revoked/expired per policy
4. Affiliate commission reversed if applicable
5. Full audit trail
