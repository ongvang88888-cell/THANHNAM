# Quiz / Assessment Architecture

## Types

Multiple choice · multiple answer · true/false · fill-in · (bank / random / timer / pass score / attempts / review / explanation)

## Modes

Quiz · practice · final exam · certification exam (stricter proctoring future)

## GPLX theory exams

Driver-license theory study/mocks use a dedicated bank (`Gplx*`) and rules in
`education-core` (`scoreGplxExam`, critical-fail). See `/docs/GPLX.md`.
Do not fork a second scoring engine inside an app shell.

## Attempt integrity

- Server scores authoritative answers (never trust client score)
- Attempt limits enforced server-side
- Timer: server start/expiry timestamps

## MVP

MCQ + true/false linked to lessons/courses; explanations on review.
