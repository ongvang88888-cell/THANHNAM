# Video Architecture

## Goals

- Never expose permanent public URLs for paid video
- Adaptive bitrate (HLS) 360p–1080p
- Entitled, short-lived signed playback
- Async transcode pipeline

## Pipeline

```
Upload (presigned) → Validate MIME/size → Original (private bucket)
 → Queue transcode job → Renditions + thumbnails + metadata
 → Status READY → CDN origin (private) → Signed playback URL
```

## Playback authorization

```
AuthN → AuthZ → Entitlement/AccessEngine → sign URL (TTL 3–15 min)
 → Player requests segments (cookie or tokenized CDN)
```

Refresh URL on expiry via authorized endpoint; do not issue multi-day URLs.

## Player requirements

Play/pause/seek · speed · resume · auto-next · fullscreen · subtitles · quality · progress · completion threshold (e.g. 90% + heartbeat)

## Processing jobs

States: `QUEUED` · `PROCESSING` · `READY` · `FAILED` (retry + DLQ)

Lecture auto-edit after upload is Wan 2.2 Replace + Nano Banana + original audio — see `docs/AI.md` and `presentProviderFeatures()`. Do not treat ffmpeg restyle as character replace.

## Providers

`TranscodePort`: **AWS MediaConvert (MVP, D6)** · MuxAdapter (optional later) · FfmpegWorkerAdapter (optional later).

## Protection extras

- Concurrent playback limits per user
- Watermark overlay hooks (user id hash / time)
- Audit unusual download/segment patterns
- No download unless offline policy explicitly allows encrypted packages (future)

## Subtitles

VTT stored as assets; AI generation optional via AI port.
