# Entitlement & Content Access Engine

## Entitlement = source of truth

Clients never decide premium/paid. Server evaluates.

### Entitlement fields

| Field | Meaning |
|-------|---------|
| userId | Subject |
| resourceType / resourceId | Target |
| source | PURCHASE · SUBSCRIPTION · BUNDLE · REWARD · COUPON · ADMIN · PROMOTION |
| sourceRef | Order item / reward tx / admin grant id |
| status | ACTIVE · EXPIRED · REVOKED |
| grantedAt / expiresAt | Time bounds |
| metadata | Non-sensitive extras |

### Invariants

- Granting is **idempotent** on `(user, resource, source, sourceRef)`
- Refund/revoke transitions are audited
- Expired rows remain for history; evaluation ignores them

## Access policies

Attached to lesson/document/product (inheritance: lesson → section → course → product defaults).

### Policy types

| Type | Behavior |
|------|----------|
| FREE | Allow authenticated or even guest per config |
| PREVIEW | Allow limited content / watermarked preview |
| PURCHASE_REQUIRED | Need product entitlement |
| SUBSCRIPTION_REQUIRED | Need active subscription entitlement matching catalog rules |
| BUNDLE_REQUIRED | Need bundle or child entitlement |
| REWARDED_AD | Eligible for reward unlock flow |
| PREREQUISITE_REQUIRED | Prior lessons completed |
| TIME_LOCKED / DRIP | Unlock after timestamp or enrollment+offset |
| ADMIN_GRANTED | Explicit admin entitlement only |

Policies compose with priority + explicit deny.

## Content Access Engine

### Components

- `EntitlementService` — CRUD/query grants
- `AccessPolicyRepository` — load policies
- `AccessPolicyEngine` — pure evaluation
- `ContentAccessService` — orchestration + caching

### Decision codes

`CAN_ACCESS` · `CANNOT_ACCESS` · `NEEDS_PURCHASE` · `NEEDS_AD` · `NEEDS_PREREQUISITE` · `EXPIRED`

### Evaluation algorithm (simplified)

```
1. Load user context (auth, roles, app)
2. If staff bypass permission → CAN_ACCESS (audited)
3. Load policies for resource (ordered)
4. Load active entitlements for user+resource (+ parents: course/bundle/library)
5. For each policy until decisive result:
   - FREE/PREVIEW → allow
   - PURCHASE/SUBSCRIPTION/BUNDLE → check entitlements
   - REWARDED_AD → if entitled via reward allow else NEEDS_AD
   - PREREQUISITE/DRIP → check progress/time
6. Default deny CANNOT_ACCESS
```

### Caching

- Short TTL cache keyed by `(userId, resourceType, resourceId, policyVersion)`
- Invalidate on entitlement grant/revoke and policy update

## Anti-patterns (forbidden)

```ts
if (user.isPremium) allow();
if (body.rewarded === true) allow();
```

## UX mapping

API returns decision + display hints; UI shows FREE / PREMIUM / BUY / WATCH AD / LOCKED without inventing rules.
