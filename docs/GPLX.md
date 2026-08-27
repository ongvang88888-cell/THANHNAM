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

## API (`/api/v1/gplx`)

All routes require auth (`X-App-Id` + Bearer).

- `GET /license-classes`
- `GET /overview?licenseClass=B`
- `GET /topics`
- `GET /topics/:id/questions?licenseClass=`
- `GET /critical`, `GET /wrong`
- `POST /practice/answer`
- `POST /mock/start` `{ licenseClass }`
- `GET /mock/:attemptId`
- `POST /mock/:attemptId/submit` `{ answers }`

## Client

Web: `/gplx` study hub + topic practice + mock exam.

## Content note

Seed ships a **demo bank** of original sample items for development. Replace with a licensed/official bank before production store listing. Do not scrape copyrighted 600-question sets.

## Monetization (later)

Free study / limited mocks → Pro unlimited mocks + tips (EntitlementService). Do not trust client `isPremium`.

## Module flag

`apps.enabledModulesJson.gplx = true`
