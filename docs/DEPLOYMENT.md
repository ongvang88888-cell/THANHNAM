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
