# Development Guide

## Phase discipline

Do not skip Master Spec phases. Architecture Package acceptance precedes Shared Core coding.

## Workflow for every change

1. Search for existing module
2. Prefer Shared/Education/Monetization/Media cores
3. Add abstraction before a new provider
4. Write tests
5. Update docs
6. Run security checklist for authz/money/media paths

## Local stack (planned)

Docker Compose: Postgres · Redis · MinIO · Mailhog · API · Worker

## Commands (to be added in implementation)

`pnpm install` · `pnpm dev` · `pnpm test` · `pnpm lint` · `pnpm migrate`

## Code ownership

See module map; PRs that cross Core boundaries need architecture review.

## Conflicts with this guide

If a request would duplicate Core, weaken security, or break entitlement/payment correctness — stop, explain, propose correct approach, wait for confirmation.
