# Payment Architecture

## Principles

- Business logic never imports Stripe/Play/Apple SDKs directly
- `PaymentProvider` adapter pattern
- Idempotent order + payment + entitlement pipeline
- Payment Policy Configuration for store rules (not hard-coded forever)

## Components

`PaymentService` · `PaymentProvider` (port) · `PaymentVerificationService` · `CheckoutService` · `RefundService` · `WebhookProcessor`

## Order state machine

```
DRAFT → AWAITING_PAYMENT → PAID → FULFILLED
                         ↘ FAILED
PAID → REFUND_PENDING → REFUNDED (partial/full)
```

Fulfillment = grant entitlements (and subscription activation).

## Checkout flow

1. Client creates checkout session with `Idempotency-Key`
2. Server creates Order + Payment intent via adapter
3. Client completes provider UX
4. Webhook (authoritative) + optional client confirm
5. Verify signature / purchase token
6. Mark paid once; fulfill once (outbox)

## Providers (planned adapters)

| Provider | Surface | MVP |
|----------|---------|-----|
| Stripe | Web (+ optional mobile where policy allows) | Yes (D3) |
| VNPay | Web VN checkout | Yes (D3) |
| Google Play Billing | Android digital unlocks in-Play | Yes (store policy) |
| Apple IAP | iOS digital unlocks | Yes (store policy) |
| MoMo / ZaloPay | Web VN | Implemented (sandbox adapters; production keys optional) |

## Store policy note

Digital content unlocks distributed via App Store / Play **require** store billing.
Encode rules in `PaymentPolicyConfig` / `allowedCheckoutProviders(platform)` —
do not sprinkle conditionals across UI forever.

## Security invariants

- Idempotent fulfill (`Transaction.providerEventId`)
- Idempotent refund (`Transaction` type `REFUND` + same unique key)
- Store token/transaction cannot be reused across orders
- Checkout `expectedSku` must match verified store SKU when present
- Apple `appAccountToken` (UUID) correlates ASN → order without trusting client alone
- Digital goods: **full refund only** (no partial amount)
- Concurrent fulfill/refund serialized with `SELECT … FOR UPDATE` on `Order`

## Entitlement fulfillment

On `OrderPaid`:

- For each order item:
  - If bundle → grant bundle + children
  - If course/document → grant resource
  - If subscription → create subscription + entitlement

All in one DB transaction where possible; else transactional outbox.

## Refunds

Adapter refund → revoke/expire entitlements → reverse affiliate commission → audit.

## Security

- No raw PAN storage
- Webhook secrets in secret manager
- Normalized provider payloads stored carefully (strip secrets)
