# Disaster Recovery Strategy

## Targets (initial)

| Tier | RPO | RTO | Components |
|------|-----|-----|------------|
| Critical | ≤ 5 min | ≤ 1 h | PostgreSQL, auth, entitlements, payments webhooks |
| High | ≤ 1 h | ≤ 4 h | Media originals, CDN origin |
| Standard | ≤ 24 h | ≤ 24 h | Analytics sinks, AI |

## Scenarios

1. Primary DB failure → failover to replica / restore PITR
2. Region outage → secondary region runbook (phase 2 multi-region)
3. Ransomware / bad migration → PITR before incident + migration rollback
4. CDN outage → origin signed URL fallback / alternate CDN adapter
5. Provider outage (Stripe/AdMob) → degraded mode banners; queue retries

## Runbooks (to be filled in implementation)

- DB failover
- Credential rotation
- Webhook replay
- Entitlement rebuild from orders (reconciliation job)

## Communication

Status page + admin `maintenance_mode` remote config.
