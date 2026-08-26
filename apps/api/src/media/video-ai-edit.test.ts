import { describe, expect, it } from "vitest";
import { isAiEditToolId, parseAiEditOptions, toolAvailability, getAiEditTool } from "@edu/ai-core";

describe("video AI edit contract", () => {
  it("only accepts catalog tools", () => {
    expect(isAiEditToolId("studio_sound")).toBe(true);
    expect(isAiEditToolId("course_enhance")).toBe(true);
    expect(isAiEditToolId("toon_talking_head")).toBe(true);
    expect(isAiEditToolId("illustrated_edition")).toBe(true);
    expect(isAiEditToolId("speech_focus")).toBe(true);
    expect(isAiEditToolId("elevenlabs_overdub")).toBe(false);
  });

  it("requires a source file for picture/audio ffmpeg tools", () => {
    const caps = { enabled: true, ffmpeg: true, speech: true, imageGen: true, llm: true };
    const enhance = getAiEditTool("picture_enhance")!;
    expect(toolAvailability(enhance, caps, false).available).toBe(false);
    expect(toolAvailability(enhance, caps, true).available).toBe(true);
  });

  it("parses start options the API will accept", () => {
    expect(parseAiEditOptions({})).toEqual({});
    expect(parseAiEditOptions({ region: "pip_br", style: "anime" })).toEqual({
      region: "pip_br",
      style: "anime",
    });
    expect(() => parseAiEditOptions({ seekSeconds: 90_000 })).toThrow(/seekSeconds/);
  });
});
