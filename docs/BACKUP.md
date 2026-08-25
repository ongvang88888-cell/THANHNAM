# Backup Strategy

## Database

- Automated daily snapshots + **continuous PITR** (WAL) in production
- Retention: ≥ 30 days PITR window (confirm with ops)
- Encrypted backups
- Monthly restore drill documented

## Object storage

- Versioning enabled on media buckets
- Cross-region replication for production originals (optional cost tradeoff)
- Lifecycle policies for incomplete multipart uploads

## Redis

- Treat as ephemeral cache; persistence optional
- Sessions can rebuild via re-login if Redis lost (acceptable with refresh revoke)

## Application config

- Infra as code + secret manager versioning

## Verification

Restore to isolated environment quarterly; measure RTO/RPO against [DISASTER_RECOVERY.md](./DISASTER_RECOVERY.md).
