import { describe, expect, it } from "vitest";
import {
  assertOwnedAbcReady,
  clampQuickTrim,
  describeRecipe,
  enhanceSpeechTrimArgs,
  isAiEditStepId,
  isAiEditToolId,
  isPublicAiEditToolId,
  parseAiEditOptions,
  progressFields,
  toolAvailability,
  getAiEditTool,
} from "@edu/ai-core";

describe("video AI edit contract", () => {
  it("keeps historical ids but only publishes Wan replace", () => {
    expect(isAiEditToolId("studio_sound")).toBe(true);
    expect(isAiEditToolId("owned_abc")).toBe(true);
    expect(isAiEditToolId("avatar_presenter")).toBe(true);
    expect(isPublicAiEditToolId("owned_abc")).toBe(true);
    expect(isPublicAiEditToolId("studio_sound")).toBe(false);
    expect(isPublicAiEditToolId("avatar_presenter")).toBe(false);
    expect(isAiEditToolId("elevenlabs_overdub")).toBe(false);
  });

  it("requires a source file and Wan keys", () => {
    const caps = {
      enabled: true,
      ffmpeg: true,
      speech: false,
      imageGen: false,
      llm: false,
      tts: false,
      heygen: false,
      minimax: false,
      veo: false,
      elevenlabs: false,
      fal: true,
      dashscope: false,
      nanoBanana: true,
      wan: true,
    };
    const tool = getAiEditTool("owned_abc")!;
    expect(toolAvailability(tool, caps, false).available).toBe(false);
    expect(toolAvailability(tool, caps, true).available).toBe(true);
    expect(toolAvailability(tool, { ...caps, wan: false, fal: false }, true).available).toBe(false);
  });

  it("parses start options the API will accept", () => {
    expect(parseAiEditOptions({})).toEqual({});
    expect(
      parseAiEditOptions({
        autoApply: true,
        lessonId: "clxxxxxxxxxxxxxxxxxxx1",
        courseId: "clxxxxxxxxxxxxxxxxxxx2",
        recipeId: "wan_nano_v1",
      }),
    ).toEqual({
      autoApply: true,
      lessonId: "clxxxxxxxxxxxxxxxxxxx1",
      courseId: "clxxxxxxxxxxxxxxxxxxx2",
      recipeId: "wan_nano_v1",
    });
    expect(() => parseAiEditOptions({ seekSeconds: 90_000 })).toThrow(/seekSeconds/);
    expect(() => assertOwnedAbcReady("owned_abc", {})).toThrow(/confirmOwned/);
    expect(() => assertOwnedAbcReady("owned_abc", { confirmOwned: true })).not.toThrow();
    expect(progressFields("apply")).toMatchObject({ progress: 92, step: "apply" });
    expect(progressFields("done").stepLabel).toMatch(/đã gắn vào bài/i);
    expect(progressFields("still").progress).toBe(28);
    expect(progressFields("replace").progress).toBe(62);
    expect(isAiEditStepId("toon")).toBe(false);
    expect(isAiEditStepId("enhance")).toBe(false);
    expect(isAiEditStepId("replace")).toBe(true);
    expect(isAiEditStepId("stitch")).toBe(true);
    const recipe = describeRecipe({ wan: false, nanoBanana: false, fal: false, dashscope: false });
    expect(recipe.recipeId).toBe("wan_nano_v1");
    expect(recipe.techniques.map((row) => row.id)).toEqual(["nano_banana", "wan_replace", "keep_audio"]);
    expect(recipe.techniques.some((row) => row.id === "toon_restyle")).toBe(false);
    expect(recipe.techniques.some((row) => row.id === "avatar_presenter")).toBe(false);
    const onePass = enhanceSpeechTrimArgs("in.mp4", "out.mp4").find((arg) => arg.includes("silenceremove="));
    expect(onePass).toContain("start_duration");
    expect(onePass).not.toContain("start_silence");
    expect(clampQuickTrim(0, 12_000, 10_000)).toEqual({ startMs: 0, endMs: 10_000 });
  });
});
