# AI Architecture

## Principles

- Optional module behind `AiPort`
- Provider-agnostic (OpenAI / Gemini / local / Null)
- If AI fails, core product still works
- Do not send secrets or unnecessary PII to models
- Feature-flagged per app

## Use cases (phased)

Outline generation · lesson summary · quiz/question generation · flashcards · study notes · transcript summary · title/description/tags suggestions · translation · subtitle generation · learning assistant

## Safety

- Prompt/response logging redacted
- Teacher review before publish for generated assessments (default)
- Rate limits per user/teacher
- Cost budgets in config

## Null adapter

Returns “AI unavailable” without throwing into critical paths.
