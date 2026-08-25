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

| Provider | Surface |
|----------|---------|
| Stripe | Web (+ optional mobile where policy allows) |
| Google Play Billing | Android digital unlocks in-Play |
| Apple IAP | iOS digital unlocks |
| VN PSP (VNPay/MoMo/…) | Web VN market (pending D3) |

## Store policy note

Digital content unlocks distributed via App Store / Play often **require** store billing. Encode rules in `PaymentPolicyConfig` per platform/app; update when policies change — do not sprinkle conditionals across UI forever.

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
