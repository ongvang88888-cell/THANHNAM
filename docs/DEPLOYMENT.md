# Deployment Architecture

## Environments

`local` · `dev` · `staging` · `production`

## Topology (MVP) — AWS `ap-southeast-1` (D2/D7)

- Containerized API + workers on **ECS Fargate**
- **RDS PostgreSQL** with PITR
- **ElastiCache Redis** (managed preferred in production)
- **S3** + **CloudFront** (private origins, signed URLs)
- **MediaConvert** for video transcode jobs
- **Secrets Manager** / SSM for secrets
- Separate subnet/security groups for workers egress to providers

## CI/CD

- PR: lint · typecheck · unit · integration (testcontainers)
- Merge to main → deploy staging
- Tagged release → production with migrations expand/contract
- Never deploy secrets via git

## Config

Env + secret manager; Remote Config for runtime toggles.

## Observability

OpenTelemetry traces · metrics · structured JSON logs · error tracking (Sentry or equiv.) · uptime checks on `/health` and `/ready`

## Scaling knobs

Horizontal API replicas · worker concurrency per queue · DB read replicas for reports · CDN for media

## Self-host VPS (Docker Compose)

For Ubuntu VPS (e.g. Vietnix):

```bash
VPS_HOST=<ip> VPS_PASS='***' ./scripts/vps-deploy.sh
# or SSH key: VPS_HOST=<ip> VPS_SSH_KEY=~/.ssh/id_ed25519 ./scripts/vps-deploy.sh
```

What it does: install/enable Docker → rsync repo to `/opt/edu-commerce` → generate `.env` once → `docker compose -f docker-compose.prod.yml up -d --build` → migrate → seed.

Services: web `:3000`, API `:3001`, Postgres + Redis (internal).

Never commit `.env` or VPS passwords. Rotate root password after sharing credentials via chat/email. Prefer SSH keys for subsequent deploys.

