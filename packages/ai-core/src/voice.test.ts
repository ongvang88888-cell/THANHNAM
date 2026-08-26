import { describe, expect, it } from "vitest";
import { atempoForFit, chunkTextForTts } from "./voice";

describe("voice", () => {
  it("chunks long scripts under 4000 chars", () => {
    const script = Array.from({ length: 40 }, (_, i) => `Câu ${i + 1}.`).join(" ");
    const chunks = chunkTextForTts(script, 80);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.length <= 80)).toBe(true);
    expect(chunks.join(" ")).toContain("Câu 1.");
  });

  it("atempoForFit stays in ffmpeg 0.5–2 range", () => {
    expect(atempoForFit(10, 10)).toBe(1);
    expect(atempoForFit(30, 10)).toBe(2);
    expect(atempoForFit(4, 10)).toBe(0.5);
    expect(atempoForFit(12, 10)).toBeCloseTo(1.2, 5);
  });
});
