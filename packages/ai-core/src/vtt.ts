export interface CaptionCue {
  startMs: number;
  endMs: number;
  text: string;
}

export const CAPTION_MAX_CHARS = 42;
export const CAPTION_MAX_LINES = 2;
export const CUE_MIN_MS = 1000;
export const CUE_MAX_MS = 7000;

export function formatVttTimestamp(ms: number): string {
  const safe = Number.isFinite(ms) ? Math.max(0, Math.round(ms)) : 0;
  const hours = Math.floor(safe / 3_600_000);
  const minutes = Math.floor((safe % 3_600_000) / 60_000);
  const seconds = Math.floor((safe % 60_000) / 1000);
  const millis = safe % 1000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

export function wrapCaptionText(text: string, maxChars = CAPTION_MAX_CHARS, maxLines = CAPTION_MAX_LINES): string {
  const words = text.trim().replace(/\s+/g, " ").split(" ").filter(Boolean);
  if (words.length === 0) return "";
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (lines.length >= maxLines) break;
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
      continue;
    }
    if (current) {
      lines.push(current);
      current = word.length > maxChars ? word.slice(0, maxChars) : word;
      continue;
    }
    current = word.slice(0, maxChars);
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines.slice(0, maxLines).join("\n");
}

export function normalizeCaptionCues(cues: CaptionCue[]): CaptionCue[] {
  const merged: CaptionCue[] = [];
  for (const cue of cues) {
    const text = cue.text.trim();
    if (!text) continue;
    const startMs = Math.max(0, Math.round(cue.startMs));
    let endMs = Math.max(startMs + CUE_MIN_MS, Math.round(cue.endMs));
    const last = merged[merged.length - 1];
    const tooShort = cue.endMs - cue.startMs < CUE_MIN_MS;
    if (last && tooShort) {
      last.endMs = Math.min(last.startMs + CUE_MAX_MS, Math.max(last.endMs, endMs));
      last.text = `${last.text} ${text}`.replace(/\s+/g, " ").trim();
      continue;
    }
    if (endMs - startMs > CUE_MAX_MS) endMs = startMs + CUE_MAX_MS;
    merged.push({ startMs, endMs, text });
  }
  return merged.map((cue) => ({
    ...cue,
    text: wrapCaptionText(cue.text),
  }));
}

export function toVtt(cues: CaptionCue[]): string {
  const lines = ["WEBVTT", ""];
  for (const cue of normalizeCaptionCues(cues)) {
    const text = cue.text.trim();
    if (!text) continue;
    const end = cue.endMs > cue.startMs ? cue.endMs : cue.startMs + CUE_MIN_MS;
    lines.push(`${formatVttTimestamp(cue.startMs)} --> ${formatVttTimestamp(end)}`);
    lines.push(text);
    lines.push("");
  }
  return `${lines.join("\n").trim()}\n`;
}

export function cuesFromWhisperSegments(
  segments: Array<{ start?: number; end?: number; text?: string }>,
): CaptionCue[] {
  const cues: CaptionCue[] = [];
  for (const segment of segments) {
    const text = typeof segment.text === "string" ? segment.text.trim() : "";
    if (!text) continue;
    const startMs = Math.max(0, Math.round((segment.start ?? 0) * 1000));
    const endMs = Math.max(startMs + 400, Math.round((segment.end ?? segment.start ?? 0) * 1000));
    cues.push({ startMs, endMs, text });
  }
  return normalizeCaptionCues(cues);
}

export function heuristicCuesFromTitle(title: string, durationMs?: number): CaptionCue[] {
  const clean = title.trim() || "Bài học";
  const window = durationMs && durationMs > 4000 ? Math.min(durationMs, 20_000) : 8_000;
  return normalizeCaptionCues([
    {
      startMs: 0,
      endMs: Math.min(window, 8000),
      text: `Bài học: ${clean}`,
    },
    {
      startMs: Math.min(window, 8000),
      endMs: Math.min(window + 8000, durationMs && durationMs > 0 ? durationMs : 16_000),
      text: "Phụ đề tự động chưa có khóa Whisper. Thêm OPENAI_API_KEY hoặc GROQ_API_KEY để nhận transcript thật. Giáo viên hãy duyệt trước khi công khai.",
    },
  ]);
}
