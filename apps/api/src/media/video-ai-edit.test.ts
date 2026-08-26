import { describe, expect, it } from "vitest";
import {
  assertOwnedAbcReady,
  clampQuickTrim,
  describeRecipe,
  enhanceSpeechTrimArgs,
  isAiEditStepId,
  isAiEditToolId,
  parseAiEditOptions,
  progressFields,
  toolAvailability,
  getAiEditTool,
} from "@edu/ai-core";

describe("video AI edit contract", () => {
  it("only accepts catalog tools", () => {
    expect(isAiEditToolId("studio_sound")).toBe(true);
    expect(isAiEditToolId("course_enhance")).toBe(true);
    expect(isAiEditToolId("toon_talking_head")).toBe(true);
    expect(isAiEditToolId("illustrated_edition")).toBe(true);
    expect(isAiEditToolId("speech_focus")).toBe(true);
    expect(isAiEditToolId("owned_abc")).toBe(true);
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
    expect(parseAiEditOptions({ confirmOwned: true, style: "flat" })).toEqual({
      confirmOwned: true,
      style: "flat",
    });
    expect(
      parseAiEditOptions({
        autoApply: true,
        lessonId: "clxxxxxxxxxxxxxxxxxxx1",
        courseId: "clxxxxxxxxxxxxxxxxxxx2",
        recipeId: "lecture_expert_v1",
      }),
    ).toEqual({
      autoApply: true,
      lessonId: "clxxxxxxxxxxxxxxxxxxx1",
      courseId: "clxxxxxxxxxxxxxxxxxxx2",
      recipeId: "lecture_expert_v1",
    });
    expect(() => parseAiEditOptions({ seekSeconds: 90_000 })).toThrow(/seekSeconds/);
    expect(() => assertOwnedAbcReady("owned_abc", { region: "pip_br" })).toThrow(/confirmOwned/);
    expect(progressFields("apply")).toMatchObject({ progress: 92, step: "apply" });
    expect(progressFields("done").stepLabel).toMatch(/sẵn sàng lưu/i);
    expect(progressFields("enhance").progress).toBe(40);
    expect(isAiEditStepId("toon")).toBe(false);
    const recipe = describeRecipe({ speech: false, imageGen: false, llm: false });
    expect(recipe.recipeId).toBe("lecture_expert_v1");
    expect(recipe.techniques.some((row) => row.id === "content_id_dodge" && row.status === "refused")).toBe(true);
    const onePass = enhanceSpeechTrimArgs("in.mp4", "out.mp4").find((arg) => arg.includes("silenceremove="));
    expect(onePass).toContain("start_duration");
    expect(onePass).not.toContain("start_silence");
    expect(clampQuickTrim(0, 12_000, 10_000)).toEqual({ startMs: 0, endMs: 10_000 });
  });
});
