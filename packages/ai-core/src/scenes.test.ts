import { describe, expect, it } from "vitest";
import { buildConcatDemuxerList, clampSceneCount, groupScenesForEdition, sceneImagePrompt, timeSliceCues } from "./scenes";

describe("illustrated edition scenes", () => {
  it("caps scene count lower when image gen is on", () => {
    expect(clampSceneCount(12, true)).toBe(6);
    expect(clampSceneCount(12, false)).toBe(12);
    expect(clampSceneCount(undefined, true)).toBe(6);
  });

  it("covers the full duration when grouping cues", () => {
    const scenes = groupScenesForEdition(
      [
        { startMs: 200, endMs: 1200, text: "mở bài" },
        { startMs: 1200, endMs: 2400, text: "công thức" },
        { startMs: 2400, endMs: 3600, text: "ví dụ" },
      ],
      8000,
      2,
    );
    expect(scenes.length).toBeLessThanOrEqual(2);
    expect(scenes[0]?.startMs).toBe(0);
    expect(scenes[scenes.length - 1]?.endMs).toBe(8000);
    expect(scenes.every((row) => row.text.length > 0)).toBe(true);
  });

  it("falls back to time slices without cues", () => {
    const slices = timeSliceCues("Excel", 12_000, 3);
    expect(slices.length).toBeGreaterThanOrEqual(2);
    expect(slices[0]?.text).toContain("Excel");
    expect(groupScenesForEdition([], 12_000, 3).length).toBeGreaterThan(0);
  });

  it("writes a concat demuxer list with a repeated last file", () => {
    const list = buildConcatDemuxerList([
      { file: "/tmp/a.jpg", durationSec: 2 },
      { file: "/tmp/b.jpg", durationSec: 3 },
    ]);
    expect(list).toContain("file '/tmp/a.jpg'");
    expect(list).toContain("duration 2.00");
    expect(list.trim().split("\n").filter((line) => line.startsWith("file "))).toHaveLength(3);
    expect(sceneImagePrompt("Excel", "cột pivot", "anime")).toMatch(/no readable text/i);
  });
});
