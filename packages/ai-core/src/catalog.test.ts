import { describe, expect, it } from "vitest";
import {
  AI_EDIT_TOOLS,
  envAiCapabilities,
  getAiEditTool,
  isAiEditToolId,
  toolAvailability,
} from "./catalog";

describe("AI edit catalog", () => {
  it("covers the market tools we ship", () => {
    expect(AI_EDIT_TOOLS.map((t) => t.id)).toEqual([
      "owned_abc",
      "studio_sound",
      "speech_focus",
      "silence_trim",
      "course_enhance",
      "picture_enhance",
      "toon_talking_head",
      "illustrated_edition",
      "auto_thumbnail",
      "ai_cover",
      "captions",
      "lesson_copy",
    ]);
  });

  it("rejects unknown tools", () => {
    expect(isAiEditToolId("runway_inpaint")).toBe(false);
    expect(getAiEditTool("captions")?.outputKind).toBe("vtt");
  });

  it("marks ffmpeg tools unavailable without ffmpeg", () => {
    const caps = { enabled: true, ffmpeg: false, speech: false, imageGen: false, llm: false };
    const sound = getAiEditTool("studio_sound");
    expect(sound).not.toBeNull();
    const avail = toolAvailability(sound!, caps, true);
    expect(avail.available).toBe(false);
    expect(avail.note).toMatch(/ffmpeg/i);
  });

  it("keeps the A+C pack available without Whisper or LLM", () => {
    const caps = { enabled: true, ffmpeg: true, speech: false, imageGen: false, llm: false };
    const tool = getAiEditTool("owned_abc")!;
    const avail = toolAvailability(tool, caps, true);
    expect(avail.available).toBe(true);
    expect(avail.mode).toBe("fallback");
    expect(tool.description).toMatch(/lecture_expert_v1/);
    expect(tool.description).not.toMatch(/tô kiểu anime|biến người trong khung/);
  });

  it("keeps illustrated edition available without Whisper or image gen", () => {
    const caps = { enabled: true, ffmpeg: true, speech: false, imageGen: false, llm: false };
    const tool = getAiEditTool("illustrated_edition")!;
    const avail = toolAvailability(tool, caps, true);
    expect(avail.available).toBe(true);
    expect(avail.mode).toBe("fallback");
  });

  it("keeps captions available in fallback mode without Whisper", () => {
    const caps = { enabled: true, ffmpeg: true, speech: false, imageGen: false, llm: false };
    const captions = getAiEditTool("captions")!;
    const avail = toolAvailability(captions, caps, true);
    expect(avail.available).toBe(true);
    expect(avail.mode).toBe("fallback");
  });

  it("honors AI_EDIT_ENABLED=false", () => {
    const prev = process.env.AI_EDIT_ENABLED;
    process.env.AI_EDIT_ENABLED = "false";
    try {
      const caps = envAiCapabilities(true);
      expect(caps.enabled).toBe(false);
      const avail = toolAvailability(getAiEditTool("ai_cover")!, caps, true);
      expect(avail.available).toBe(false);
    } finally {
      if (prev === undefined) delete process.env.AI_EDIT_ENABLED;
      else process.env.AI_EDIT_ENABLED = prev;
    }
  });
});
