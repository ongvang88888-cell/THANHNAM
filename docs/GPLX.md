# GPLX — Ôn thi lý thuyết giấy phép lái xe

## Purpose

Study + mock exam for Vietnamese driver's license theory (GPLX), reusing Shared/Education Core scoring patterns — **not** a forked quiz engine.

Feature set aligned with common store apps (GPLX Pro, ViGPLX, dtlx, Ôn thi 600 câu): topic practice, critical drills, fixed exam sets, bookmarks, search, flashcards, streak, weak-topic analytics, timed mocks.

## Domain

| Entity | Role |
|--------|------|
| `GplxTopic` | Chapters (concepts, signs, situations, ethics, technique) |
| `GplxBankQuestion` / `GplxBankAnswer` | App-scoped question bank (`licenseClassesJson`, `isCritical`) |
| `GplxStudyProgress` | Per-user mastery / wrong tracking |
| `GplxMockAttempt` | Timed mock (`mode`: `random` \| `fixed` \| `critical_only`) |
| `GplxFixedSet` | Pre-built exam sets (bộ đề cố định) |
| `GplxBookmark` | Saved questions |
| `GplxStudyStreak` | Consecutive study-day streak |

## Exam rules (education-core) — chuẩn 2026

Nguồn tham chiếu cấu trúc đề: **Thông tư 12/2025/TT-BCA** (phụ lục quy trình sát hạch) + **CV 2262/CSGT-P5** (cấu trúc bộ đề 600 câu, 5/2025). Mỗi đề **1 câu điểm liệt**; sai liệt = không đạt.

| Hạng | Câu/đề | Thời gian | Đạt |
|------|--------|-----------|-----|
| A1 | 25 | 19 phút | ≥21 |
| A | 25 | 19 phút | ≥23 |
| B1 | 25 | 19 phút | ≥23 |
| B | 30 | 20 phút | ≥27 |
| C1 | 35 | 22 phút | ≥32 |
| C | 40 | 24 phút | ≥36 |
| D1/D2/D/BE/CE/DE | 45 | 26 phút | ≥41 |

`pickMockQuestionIds` rút **đúng 1** câu liệt + phần còn lại không liệt.

Content helpers: `GPLX_TIPS`, `GPLX_SIGNS`, `buildGplxSevenDayPlan`, `GPLX_PRO_PRODUCT_SLUG`, `GPLX_FREE_MOCKS_PER_DAY`.

## Content note

Seed là **ngân hàng demo gốc** (100+ câu), đủ để thi thử mọi hạng theo cấu hình trên — **không** phải bản sao bộ 600 câu có bản quyền. Trước lên store cần thay bằng bank có giấy phép.

## API (`/api/v1/gplx`)

All routes require auth (`X-App-Id` + Bearer).

- `GET /license-classes`
- `GET /tips` · `GET /signs?group=&q=` · `GET /plan?licenseClass=`
- `GET /overview?licenseClass=B` — stats, Pro quota, **streak**, **bookmarkCount**, **weakTopics** (top 3), plan preview
- `GET /topics` · `GET /topics/:id/questions?licenseClass=`
- `GET /critical` · `GET /wrong` · `GET /hardest` · `GET /weak-topics`
- `GET /search?q=&licenseClass=`
- `GET/POST /bookmarks` · `DELETE /bookmarks/:questionId`
- `GET /fixed-sets?licenseClass=`
- `GET /flashcards?licenseClass=&kind=signs|critical|wrong`
- `POST /practice/answer` (updates streak)
- `POST /mock/start` `{ licenseClass, mode?, fixedSetId? }` — free tier **2 mocks/day** unless `gplx-pro`
- `GET /mock/:attemptId`
- `POST /mock/:attemptId/submit` `{ answers }`

## Clients

- Web: `/gplx`, search, bookmarks, flashcards, fixed sets, hardest, tips, signs, plan, topic practice, timed exam (grid + flag for review)
- Mobile: `/gplx`, `/gplx/topic/[id]`, `/gplx/exam/[attemptId]`, `/gplx/flashcards`, `/gplx/sets`

## Monetization

- Product slug **`gplx-pro`** (`OTHER_DIGITAL_PRODUCT`)
- Entitlement SoR: `resourceType=product`, `resourceId=<gplx-pro id>`
- Free: unlimited study; **2 mock exams / calendar day** (all modes count)
- Pro: unlimited mocks (checkout via existing commerce)

## Module flag

`apps.enabledModulesJson.gplx = true`
