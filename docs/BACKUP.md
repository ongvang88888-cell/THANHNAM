# Backup Strategy

## Database

- Automated daily snapshots + **continuous PITR** (WAL) in production (RDS)
- Retention: ≥ 30 days PITR window (confirm with ops)
- Encrypted backups
- Monthly restore drill documented
- Self-host helper: `scripts/ops/backup-postgres.sh` / `restore-postgres.sh` (logical `pg_dump`; compose sidecar writes `/backups` daily). Prefer RDS PITR over dump files for production.

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
