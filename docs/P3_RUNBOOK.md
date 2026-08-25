# P3 — Commerce money-path stability

P3 does **not** add MoMo/marketplace. It hardens the payment → fulfill → refund path so concurrent webhooks, replays, and partial refunds cannot corrupt entitlements.

## Why P3 (stability first)

| Risk found in P0–P2 | Fix |
|---------------------|-----|
| Concurrent fulfill (two event ids) on same order | `SELECT … FOR UPDATE` on `Order` inside fulfill txn |
| Concurrent / replayed refund ASN | Refund writes `Transaction(type=REFUND, providerEventId)` unique; replay → `already/replayed` |
| Truncated store confirm event ids | `stableProviderEventId(prefix, token)` = SHA-256 (no prefix collision) |
| Non-SUCCEEDED fulfill marked order `FAILED` (incl. footguns) | Fulfill ignores non-SUCCEEDED without mutating order |
| Partial refund + full entitlement revoke | **Full refund only** for digital entitlements |
| Confirm on refunded/cancelled order | Reject with 409 unless already fulfilled |

Affiliate commission reverse is **not** in P3: schema has no commission ledger yet (MVP deferred). Refund still revokes entitlements + audit + analytics.

## Invariants (do not regress)

1. **One CHARGE transaction per `providerEventId`** (unique)
2. **One REFUND transaction per refund `providerEventId`** (ASN UUID / `local_refund_{orderId}`)
3. **Fulfill only from `AWAITING_PAYMENT`** (after lock); `PAID`/`FULFILLED` → idempotent already
4. **Refund only from `PAID` | `FULFILLED` | `REFUND_PENDING`**; never partial amount
5. **Entitlement revoke** by order-item `sourceRef` on full refund
6. **Store token reuse** across orders still blocked (P2)

## Code map

- `packages/monetization-core/src/money-stability.ts` — pure gates + stable ids
- `apps/api/src/commerce/commerce.module.ts` — `fulfillPaidOrder` / `refundOrderInternal`

## Smoke checklist

```bash
# 1) mock checkout fulfill
# 2) confirm same store token twice → second already/replayed (same event id)
# 3) admin refund amount < full → 400 Partial refunds…
# 4) admin refund full → REFUNDED + entitlements REVOKED
# 5) same ASN providerEventId twice → already/replayed, single Refund row
# 6) confirm after refund → 409
```

## Out of P3

- MoMo / ZaloPay
- Marketplace split (D4 off)
- Affiliate ledger + reverse
- Native EAS IAP module install
- Coupon checkout (schema exists; not wired — next harden pass if needed)
