export interface CaptionCue {
  startMs: number;
  endMs: number;
  text: string;
}

export function formatVttTimestamp(ms: number): string {
  const safe = Number.isFinite(ms) ? Math.max(0, Math.round(ms)) : 0;
  const hours = Math.floor(safe / 3_600_000);
  const minutes = Math.floor((safe % 3_600_000) / 60_000);
  const seconds = Math.floor((safe % 60_000) / 1000);
  const millis = safe % 1000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

export function toVtt(cues: CaptionCue[]): string {
  const lines = ["WEBVTT", ""];
  for (const cue of cues) {
    const text = cue.text.trim();
    if (!text) continue;
    const end = cue.endMs > cue.startMs ? cue.endMs : cue.startMs + 1000;
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
  return cues;
}

export function heuristicCuesFromTitle(title: string, durationMs?: number): CaptionCue[] {
  const clean = title.trim() || "Bài học";
  const window = durationMs && durationMs > 4000 ? Math.min(durationMs, 20_000) : 8_000;
  return [
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
  ];
}
