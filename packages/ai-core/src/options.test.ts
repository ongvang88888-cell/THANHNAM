import { describe, expect, it } from "vitest";
import { assertOwnedAbcReady, assertStudioConsent, isPlaceholderLessonTitle, parseAiEditOptions } from "./options";

describe("parseAiEditOptions", () => {
  it("accepts empty and known fields", () => {
    expect(parseAiEditOptions(undefined)).toEqual({});
    expect(parseAiEditOptions({ seekSeconds: 3.5, prompt: "  poster  " })).toEqual({
      seekSeconds: 3.5,
      prompt: "poster",
    });
    expect(parseAiEditOptions({ region: "pip_br", style: "anime", maxScenes: 6 })).toEqual({
      region: "pip_br",
      style: "anime",
      maxScenes: 6,
    });
    expect(parseAiEditOptions({ confirmOwned: true })).toEqual({ confirmOwned: true });
    expect(parseAiEditOptions({ recipeId: "lecture_expert_v1" })).toEqual({ recipeId: "lecture_expert_v1" });
    expect(
      parseAiEditOptions({
        autoApply: true,
        lessonId: "lesson_abc12345",
        courseId: "course_xyz98765",
      }),
    ).toEqual({
      autoApply: true,
      lessonId: "lesson_abc12345",
      courseId: "course_xyz98765",
    });
  });

  it("rejects unknown or invalid fields", () => {
    expect(() => parseAiEditOptions({ voiceClone: true })).toThrow(/không hợp lệ/);
    expect(() => parseAiEditOptions({ seekSeconds: -1 })).toThrow(/seekSeconds/);
    expect(() => parseAiEditOptions({ region: "center" })).toThrow(/region/);
    expect(() => parseAiEditOptions({ style: "oil" })).toThrow(/style/);
    expect(() => parseAiEditOptions({ confirmOwned: "yes" })).toThrow(/confirmOwned/);
    expect(() => parseAiEditOptions({ autoApply: "yes" })).toThrow(/autoApply/);
    expect(() => parseAiEditOptions({ lessonId: "short" })).toThrow(/lessonId/);
    expect(() => parseAiEditOptions({ recipeId: "anime_v1" })).toThrow(/recipeId/);
    expect(() => parseAiEditOptions("x")).toThrow(/object/);
  });

  it("treats empty and default lesson titles as placeholders", () => {
    expect(isPlaceholderLessonTitle("")).toBe(true);
    expect(isPlaceholderLessonTitle("Bài mới")).toBe(true);
    expect(isPlaceholderLessonTitle("Bài 1")).toBe(true);
    expect(isPlaceholderLessonTitle("Giới thiệu khóa học")).toBe(false);
  });

  it("requires an ownership commitment for the A+C pack", () => {
    expect(() => assertOwnedAbcReady("owned_abc", {})).toThrow(/confirmOwned/);
    expect(() => assertOwnedAbcReady("owned_abc", { confirmOwned: false })).toThrow(/confirmOwned/);
    expect(() => assertOwnedAbcReady("owned_abc", { confirmOwned: true })).not.toThrow();
    expect(() => assertOwnedAbcReady("course_enhance", {})).not.toThrow();
  });

  it("parses presenter options and requires studio consent", () => {
    expect(
      parseAiEditOptions({
        script: "Xin chào lớp",
        targetLanguage: "en",
        startMs: 1000,
        endMs: 4000,
        confirmLikeness: true,
        confirmFaceEdit: true,
        confirmVoiceClone: true,
        confirmOwned: true,
      }),
    ).toEqual({
      script: "Xin chào lớp",
      targetLanguage: "en",
      startMs: 1000,
      endMs: 4000,
      confirmLikeness: true,
      confirmFaceEdit: true,
      confirmVoiceClone: true,
      confirmOwned: true,
    });
    expect(() => parseAiEditOptions({ targetLanguage: "xx" })).toThrow(/targetLanguage/);
    expect(() => parseAiEditOptions({ script: "x".repeat(4001) })).toThrow(/script/);
    expect(() => assertStudioConsent("avatar_presenter", { confirmOwned: true })).toThrow(/confirmLikeness/);
    expect(() =>
      assertStudioConsent("avatar_presenter", { confirmOwned: true, confirmLikeness: true }),
    ).not.toThrow();
    expect(() => assertStudioConsent("video_translate", { confirmOwned: true })).toThrow(/targetLanguage/);
    expect(() => assertStudioConsent("eye_contact", { confirmOwned: true })).toThrow(/confirmFaceEdit/);
    expect(() => assertStudioConsent("overdub", { confirmOwned: true, confirmVoiceClone: true })).toThrow(/script/);
  });
});
