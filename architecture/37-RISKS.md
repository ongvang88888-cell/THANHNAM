# 37. Risk Register

| ID | Risk | Likelihood | Impact | Mitigation |
|----|------|------------|--------|------------|
| R1 | Store billing policy violation | M | H | PaymentPolicyConfig; legal review; adapters per store |
| R2 | Reward fraud / replay | M | H | AdMob SSV; unique tx; quotas; anomaly alerts |
| R3 | Content leakage via shared URLs | M | H | Short TTL; concurrency limits; watermark; audit |
| R4 | Duplicate entitlements on webhook retry | M | H | Idempotency keys; unique constraints |
| R5 | Premature microservices complexity | H | M | Modular monolith first |
| R6 | Scope creep before Core stable | H | H | MVP gate; Architecture Package acceptance |
| R7 | VN payment fragmentation | M | M | Provider port + one PSP first |
| R8 | Transcode cost blowup | M | M | Lifecycle delete failed uploads; quality presets |
| R9 | Teacher data cross-leak | L | H | Scoped repos + automated authz tests |
| R10 | AI data leakage | L | H | Redaction; optional module; flags |
| R11 | Single-region outage | M | H | PITR; DR runbooks; later multi-region |
| R12 | Hard-coded product types in UI | M | M | Cursor rules + code review checklist |

## Escalation

Any change that weakens R1–R4 mitigations requires architecture review + explicit stakeholder approval.
