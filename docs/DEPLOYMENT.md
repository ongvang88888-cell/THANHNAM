# Deployment Architecture

## Environments

`local` · `dev` · `staging` · `production`

## Topology (MVP)

- Containerized API + workers (ECS/Cloud Run/Kubernetes — pick with D2)
- Managed PostgreSQL with PITR
- Managed Redis
- Object storage + CDN
- Separate subnet for workers egress to providers

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
