import { describe, expect, it } from "vitest";
import { buildTitlePosterSvg, escapeXml, heuristicLessonCopy, NullAiAdapter } from "./providers";

describe("Null AI adapter", () => {
  it("escapes poster text", () => {
    expect(escapeXml(`A&B<"x">`)).toBe("A&amp;B&lt;&quot;x&quot;&gt;");
    expect(buildTitlePosterSvg("Excel & Word")).toContain("Excel &amp; Word");
    expect(buildTitlePosterSvg("Excel & Word")).toContain("<svg");
  });

  it("returns usable copy without a paid key", async () => {
    const port = new NullAiAdapter();
    const copy = await port.suggestLessonCopy({ title: "Excel cơ bản" });
    expect(copy.title).toContain("Excel");
    expect(copy.description.length).toBeGreaterThan(10);
    expect(copy.tags.length).toBeGreaterThan(0);
    const cover = await port.generateCover({ title: "Excel cơ bản" });
    expect(cover.contentType).toBe("image/svg+xml");
    expect(cover.bytes.includes("Excel")).toBe(true);
  });

  it("prefers transcript snippet in heuristic copy", () => {
    const copy = heuristicLessonCopy("Toán", "Hôm nay học phương trình bậc hai.");
    expect(copy.description).toContain("phương trình");
  });

  it("refuses speak and translate without a paid key", async () => {
    const port = new NullAiAdapter();
    await expect(port.speak({ text: "hello" })).rejects.toThrow(/TTS|OPENAI_API_KEY|ELEVENLABS/i);
    await expect(port.translateText({ text: "hello", targetLanguage: "en" })).rejects.toThrow(/LLM|dịch/i);
  });
});

