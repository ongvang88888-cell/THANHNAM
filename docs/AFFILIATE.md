# Affiliate Architecture

## Flow

Affiliate account → referral link/code → click → registration attribution → purchase attribution → commission pending → approved → paid; refund reverses.

## Config

Commission by product / course / bundle / campaign / affiliate.

## Integrity

Last-click vs first-click configurable; cookie/device attribution window; server-side attach on signup/checkout.

## Implemented (MVP)

- `AffiliateCode` + `AffiliateCommission` schema
- Checkout accepts `affiliateCode` (web also reads `?ref=`)
- Commission PENDING at checkout → EARNED on fulfill (bps of `order.totalMinor`) → REVERSED on refund
- Admin: list/create codes, list commissions
- Seed: `TEACHERREF` (teacher, 10%)

## Config

Commission by code (`commissionBps`); default `AFFILIATE_DEFAULT_BPS=1000`.
Self-referral rejected.

## Later

Payouts / approval workflow Can wait for Could phase.