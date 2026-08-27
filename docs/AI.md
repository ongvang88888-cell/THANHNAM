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

## Lecture auto-edit: Wan 2.2 + Fal + Nano Banana

Upload of a lecture video does **not** invent motion, swap to a talking-head studio, or draw a Ken Burns nameplate. The server path is:

1. **Nano Banana still** — Gemini native image gen draws one consistent character still, or reuse a stable public `https` still. Model wired today: `gemini-2.5-flash-image` (fallback `gemini-2.5-flash-image-preview`). Call: `POST …/v1beta/models/{model}:generateContent?key=` with `responseModalities: ["TEXT", "IMAGE"]`. Env: `GEMINI_API_KEY` or `GOOGLE_GENERATIVE_AI_API_KEY`. Docs: [Gemini image generation](https://ai.google.dev/gemini-api/docs/image-generation). All Gemini images include a SynthID watermark.
2. **Fal storage** (when `FAL_KEY` is set) — initiate + PUT so Wan can read the still and each ~20s chunk.
3. **Wan 2.2 Animate Replace** — keep filmed motion, lighting, and scene; replace the person with the still. Fal model: `fal-ai/wan/v2.2-14b/animate/replace`. Auth: `Authorization: Key $FAL_KEY`. Queue: `https://queue.fal.run/…`. Required: `video_url`, `image_url`. Official optional schema: `guidance_scale` (default 1), `resolution` `480p|580p|720p` (default `480p`), `seed`, `num_inference_steps` (default 20), `shift` 1–10 (default 5), `video_quality`, `video_write_mode`, safety checkers, `use_turbo`, `return_frames_zip`. Docs: [Fal Replace API](https://fal.ai/models/fal-ai/wan/v2.2-14b/animate/replace/api).
4. **ffmpeg mux original lecture audio** — Wan/Fal output is not trusted to keep the lesson soundtrack.

DashScope `wan2.2-animate-mix` (`DASHSCOPE_API_KEY`, async `X-DashScope-Async`) is a **fallback only** when Fal is missing.

Query the learned catalog at runtime:

- `GET /videos/character` → `providers`
- `GET /videos/:id/ai/catalog` → `providers`
- `@edu/ai-core` `presentProviderFeatures()` / `PROVIDER_FEATURES`

### Wired on upload (`status: wired_auto`)

`nano_banana_still` · `fal_storage_upload` · `fal_queue` · `fal_wan_replace` · `keep_original_audio`

### Reserved — do not auto-run

These are official product features we learned so later work can call them on purpose. They must stay off the upload path:

| id | Official model | Why reserved |
| --- | --- | --- |
| `fal_wan_move` | `fal-ai/wan/v2.2-14b/animate/move` | Still follows a driving video; drops the original scene |
| `fal_wan_speech_to_video` | `fal-ai/wan/v2.2-14b/speech-to-video` | Invents a talking clip from still + audio |
| `fal_wan_image_to_video` | `fal-ai/wan/v2.2-a14b/image-to-video` | Invents a clip from a still + prompt |
| `dashscope_wan_replace` | `wan2.2-animate-mix` | Upload fallback only if Fal is absent |
| `nano_banana_edit_still` | `gemini-2.5-flash-image` | Text + image edit; not needed for first still |
| `nano_banana_2_lite_still` | `gemini-3.1-flash-lite-image` | Official Nano Banana 2 Lite — do not silently switch |
| `nano_banana_2_still` | `gemini-3.1-flash-image` | Official Nano Banana 2; Interactions API on current docs |
| `nano_banana_pro_still` | `gemini-3-pro-image` | Official Nano Banana Pro |
| `nano_banana_video_to_image` | `gemini-3.1-flash-image` | Video → poster; not character replace |
| `nano_banana_search_grounding` | Gemini 3 image + Google Search | Not for owned lecture footage |

Wan official conceptual modes (Hugging Face [Wan2.2-Animate-14B](https://huggingface.co/Wan-AI/Wan2.2-Animate-14B)): **replacement** (wired) vs **animation** (Fal Move, reserved).

### Forbidden fallbacks

If keys are missing, fail in Vietnamese (`WAN_MISSING_KEY` / `NANO_BANANA_MISSING_KEY`). Do not restore Ken Burns nameplates, toon filters, HeyGen/Hailuo/D-ID HTTP as a working upload path.

### Keys (VPS `.env` only)

- Fal: `FAL_KEY` (alias `FAL_API_KEY`)
- Gemini: `GEMINI_API_KEY` (alias `GOOGLE_GENERATIVE_AI_API_KEY`)
- DashScope fallback: `DASHSCOPE_API_KEY` (alias `DASHSCOPE_KEY`)

Never commit keys. Never ask the user to paste secrets in chat.
