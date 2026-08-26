import { describe, expect, it } from "vitest";
import {
  cuesFromWhisperSegments,
  formatVttTimestamp,
  heuristicCuesFromTitle,
  normalizeCaptionCues,
  toVtt,
  wrapCaptionText,
} from "./vtt";

describe("VTT helpers", () => {
  it("formats timestamps", () => {
    expect(formatVttTimestamp(0)).toBe("00:00:00.000");
    expect(formatVttTimestamp(3661001)).toBe("01:01:01.001");
  });

  it("builds a valid VTT file", () => {
    const vtt = toVtt([
      { startMs: 0, endMs: 1500, text: "Xin chào" },
      { startMs: 1500, endMs: 3000, text: "  " },
    ]);
    expect(vtt.startsWith("WEBVTT")).toBe(true);
    expect(vtt).toContain("00:00:00.000 --> 00:00:01.500");
    expect(vtt).toContain("Xin chào");
    expect(vtt).not.toContain("00:00:01.500 --> 00:00:03.000");
  });

  it("maps whisper segments", () => {
    const cues = cuesFromWhisperSegments([
      { start: 0.2, end: 1.4, text: " một " },
      { start: 1.4, text: "" },
    ]);
    expect(cues).toEqual([{ startMs: 200, endMs: 1400, text: "một" }]);
  });

  it("creates reviewable heuristic cues", () => {
    const cues = heuristicCuesFromTitle("Excel cơ bản", 20_000);
    expect(cues[0]?.text).toContain("Excel cơ bản");
    expect(cues[1]?.text).toMatch(/Whisper|duyệt/i);
    expect(toVtt(cues)).toContain("WEBVTT");
  });

  it("wraps captions to two broadcast lines", () => {
    const wrapped = wrapCaptionText(
      "Phụ đề tự động chưa có khóa Whisper. Thêm OPENAI_API_KEY hoặc GROQ_API_KEY để nhận transcript thật.",
    );
    const lines = wrapped.split("\n");
    expect(lines.length).toBeLessThanOrEqual(2);
    expect(lines.every((line) => line.length <= 42)).toBe(true);
  });

  it("merges short whisper cues and clamps duration", () => {
    const cues = normalizeCaptionCues([
      { startMs: 0, endMs: 400, text: "Xin" },
      { startMs: 400, endMs: 700, text: "chào các bạn trong buổi học hôm nay về Excel" },
    ]);
    expect(cues).toHaveLength(1);
    expect(cues[0]?.endMs).toBeGreaterThanOrEqual(1000);
    expect(cues[0]?.endMs - (cues[0]?.startMs ?? 0)).toBeLessThanOrEqual(7000);
    expect(cues[0]?.text.split("\n").length).toBeLessThanOrEqual(2);
  });
});
