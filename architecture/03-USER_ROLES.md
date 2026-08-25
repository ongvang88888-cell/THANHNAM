# 3. User Roles

## Role model

RBAC with optional ABAC attributes (`app_id`, `org_id`, `creator_id`, resource ownership).

| Role | Description | Typical permissions |
|------|-------------|---------------------|
| `guest` | Unauthenticated | Browse public catalog, preview free content |
| `student` | Learner | Learn entitled content, purchase, progress, certificates |
| `teacher` | Creator/instructor | CRUD own courses/docs (draft), analytics own, submit review |
| `teacher_assistant` | Optional helper | Limited edit/grade within assigned courses |
| `affiliate` | Marketer | Links, clicks, commissions view |
| `support_agent` | Ops support | Read orders/users, limited grants with audit |
| `admin` | Platform operator | Full catalog/commerce/users/config |
| `super_admin` | Break-glass | System settings, secrets rotation triggers, destructive ops |

## Contexts (inspired by LMS context patterns)

Permissions evaluate in context:

- Platform
- App
- Organization / Creator (future marketplace)
- Product / Course
- Lesson / Content

A user may be **teacher** in Course A and **student** in Course B.

## Isolation rules

- Teachers cannot read other teachers’ private analytics/revenue unless admin or shared org role.
- Students cannot enumerate other students’ PII.
- Affiliates see only own attribution data.
- Support grants require reason + audit log.

## Service accounts

System actors: `payment_webhook`, `ad_ssv`, `media_worker`, `scheduler` — no human login; signed machine credentials / mTLS / internal network only.
