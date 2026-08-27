# GPLX — Ôn thi lý thuyết giấy phép lái xe

## Purpose

Study + mock exam for Vietnamese driver's license theory (GPLX), reusing Shared/Education Core scoring patterns — **not** a forked quiz engine.

## Domain

| Entity | Role |
|--------|------|
| `GplxTopic` | Chapters (concepts, signs, situations, ethics, technique) |
| `GplxBankQuestion` / `GplxBankAnswer` | App-scoped question bank (`licenseClassesJson`, `isCritical`) |
| `GplxStudyProgress` | Per-user mastery / wrong tracking |
| `GplxMockAttempt` | Timed mock exam with server start/`expiresAt` |

## Exam rules (education-core)

`getGplxExamRules(class)` — question count, pass correct count, duration, critical-fail.

`scoreGplxExam` — server-authoritative; **wrong critical ⇒ fail** when enabled.

`pickMockQuestionIds` — random draw preferring ~20% critical.

Content helpers: `GPLX_TIPS`, `GPLX_SIGNS`, `buildGplxSevenDayPlan`, `GPLX_PRO_PRODUCT_SLUG`, `GPLX_FREE_MOCKS_PER_DAY`.

## API (`/api/v1/gplx`)

All routes require auth (`X-App-Id` + Bearer).

- `GET /license-classes`
- `GET /tips` · `GET /signs?group=` · `GET /plan?licenseClass=`
- `GET /overview?licenseClass=B` (includes `isPro`, mock quota, plan preview)
- `GET /topics`
- `GET /topics/:id/questions?licenseClass=`
- `GET /critical`, `GET /wrong`
- `POST /practice/answer`
- `POST /mock/start` `{ licenseClass }` — free tier limited to **2 mocks/day** unless entitled to product `gplx-pro`
- `GET /mock/:attemptId`
- `POST /mock/:attemptId/submit` `{ answers }`

## Clients

- Web: `/gplx`, tips, signs, 7-day plan, topic practice, timed exam
- Mobile: `apps/mobile-student` routes `/gplx`, `/gplx/topic/[id]`, `/gplx/exam/[attemptId]`

## Monetization

- Product slug **`gplx-pro`** (`OTHER_DIGITAL_PRODUCT`)
- Entitlement SoR: `resourceType=product`, `resourceId=<gplx-pro id>`
- Free: unlimited study; **2 mock exams / calendar day**
- Pro: unlimited mocks (checkout via existing commerce)

## Content note

Seed ships a **demo bank** of original sample items for development. Replace with a licensed/official bank before production store listing. Do not scrape copyrighted 600-question sets.

## Module flag

`apps.enabledModulesJson.gplx = true`
