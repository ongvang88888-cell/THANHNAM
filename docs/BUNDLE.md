# Bundle / Combo Architecture

## Definition

A Bundle is a Product (`COURSE_BUNDLE` | `DOCUMENT_BUNDLE` | `MIXED_BUNDLE`) referencing multiple child products.

## Fields

id · name · products[] · price · discount · start/end · visibility · purchase_limit · campaign · status

## Purchase fulfillment

```
Payment success
 → OrderItem(bundle)
 → Entitlement(resourceType=bundle)
 → For each child product: Entitlement(child) source=BUNDLE sourceRef=orderItemId
```

Children grants are derived; do not require manual admin linking.

## Access

Access Engine accepts either direct product entitlement or parent bundle entitlement (configurable). Prefer **materialized child entitlements** at purchase time for simpler lesson checks and clearer revocation.

## Revocation

Refund bundle → revoke bundle entitlement + all child entitlements with same `sourceRef`.

## Campaigns

Optional windowed availability; enforce at checkout, not only UI hide.
