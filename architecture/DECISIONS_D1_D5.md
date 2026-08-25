# Locked Decisions — D1–D5

**Status:** DECIDED  
**Date:** 2026-08-25  
**Authority:** Stakeholder confirmation of Architecture Package recommendations  

| ID | Decision | Locked value | Notes |
|----|----------|--------------|-------|
| **D1** | Mobile stack | **Expo React Native** | Share TypeScript types/contracts with web + API. Flutter not used for student MVP. |
| **D2** | Cloud | **AWS** | Primary cloud. S3-compatible storage abstraction retained (`IStorageProvider`). Local/dev: MinIO. |
| **D3** | VN payments | **Stripe + VNPay in MVP** | All providers behind `PaymentProvider` adapters. MoMo/ZaloPay = future adapters only. Play Billing + Apple IAP remain required for in-app digital unlocks per store policy. |
| **D4** | Marketplace revenue split | **Off in MVP** | Keep `creator_user_id` / future split tables readiness. No payout split engine in MVP. |
| **D5** | Multi-tenant isolation | **Shared PostgreSQL + `app_id`** | Optional `org_id` for later org/marketplace. No schema-per-tenant in MVP. |

## Follow-on locks (consistent with D2)

| ID | Decision | Locked value |
|----|----------|--------------|
| **D6** | Video transcoder (MVP) | **AWS Elemental MediaConvert** via `TranscodePort` (FFmpeg worker optional later) |
| **D7** | Primary region | **`ap-southeast-1` (Singapore)** |

## Implications

- Mobile app lives in `apps/mobile-student` (Expo).
- Deploy API/workers on AWS (ECS or EKS — prefer **ECS Fargate** for MVP simplicity).
- DB: **Amazon RDS PostgreSQL** with PITR.
- Cache/queue: **ElastiCache Redis** (or Redis on ECS for early staging if cost-constrained; production prefer managed).
- CDN: **CloudFront** in front of private S3 origins (signed URLs/cookies).
- Secrets: **AWS Secrets Manager** / SSM Parameter Store.
- Email: **SES** adapter first.
- VN web checkout: Stripe + VNPay; mobile store digests: Play/Apple adapters.

## Change control

Changing D1–D5 after Phase 5 starts requires an architecture amendment and impact review (especially D2/D5).
