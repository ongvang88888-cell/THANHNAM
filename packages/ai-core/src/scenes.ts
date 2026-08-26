import type { CaptionCue } from "./vtt";

export function clampSceneCount(maxScenes: number | undefined, imageGen: boolean): number {
  const fallback = imageGen ? 6 : 8;
  const requested = maxScenes ?? fallback;
  const cap = imageGen ? 6 : 12;
  return Math.min(cap, Math.max(3, requested));
}

export function timeSliceCues(title: string, durationMs: number, sceneCount: number): CaptionCue[] {
  const duration = Math.max(1000, durationMs);
  const count = Math.min(sceneCount, Math.max(1, Math.round(duration / 4000)));
  const slice = Math.max(1000, Math.round(duration / count));
  const clean = title.trim() || "Bài học";
  const cues: CaptionCue[] = [];
  for (let i = 0; i < count; i += 1) {
    const startMs = i * slice;
    const endMs = i === count - 1 ? duration : Math.min(duration, startMs + slice);
    cues.push({
      startMs,
      endMs,
      text: i === 0 ? clean : `${clean} — phần ${i + 1}`,
    });
  }
  return cues;
}

export function groupScenesForEdition(
  cues: CaptionCue[],
  durationMs: number,
  maxScenes: number,
): CaptionCue[] {
  const duration = Math.max(1000, durationMs);
  const cap = Math.min(12, Math.max(1, Math.round(maxScenes)));
  const usable = cues
    .map((cue) => ({
      startMs: Math.max(0, cue.startMs),
      endMs: Math.max(cue.startMs + 400, cue.endMs),
      text: cue.text.trim(),
    }))
    .filter((cue) => cue.text.length > 0);

  if (usable.length === 0) {
    return timeSliceCues("Bài học", duration, cap);
  }

  const merged: CaptionCue[] = [];
  const groupSize = Math.max(1, Math.ceil(usable.length / cap));
  for (let i = 0; i < usable.length; i += groupSize) {
    const chunk = usable.slice(i, i + groupSize);
    const first = chunk[0];
    const last = chunk[chunk.length - 1];
    if (!first || !last) continue;
    merged.push({
      startMs: first.startMs,
      endMs: last.endMs,
      text: chunk.map((row) => row.text).join(" ").replace(/\s+/g, " ").slice(0, 180),
    });
  }

  if (merged.length === 0) {
    return timeSliceCues("Bài học", duration, cap);
  }

  const first = merged[0];
  const last = merged[merged.length - 1];
  if (first) first.startMs = 0;
  if (last) last.endMs = Math.max(last.endMs, duration);
  return merged.slice(0, cap);
}

export function buildConcatDemuxerList(entries: Array<{ file: string; durationSec: number }>): string {
  if (entries.length === 0) {
    throw new Error("Cần ít nhất một cảnh để dựng bản hoạt hình");
  }
  const lines: string[] = [];
  for (const entry of entries) {
    const safe = entry.file.replace(/\\/g, "/").replace(/'/g, "'\\''");
    lines.push(`file '${safe}'`);
    lines.push(`duration ${Math.max(0.4, entry.durationSec).toFixed(2)}`);
  }
  const last = entries[entries.length - 1];
  if (last) {
    const safe = last.file.replace(/\\/g, "/").replace(/'/g, "'\\''");
    lines.push(`file '${safe}'`);
  }
  return `${lines.join("\n")}\n`;
}

export function sceneImagePrompt(title: string, beat: string, style: string): string {
  const topic = `${title}: ${beat}`.replace(/\s+/g, " ").trim().slice(0, 160);
  return `Educational course illustration, ${style} style, no logos, no readable text, no watermarks, classroom or study mood for: ${topic}`;
}
