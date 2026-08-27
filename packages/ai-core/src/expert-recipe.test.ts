import { describe, expect, it } from "vitest";
import {
  LECTURE_ENHANCE_VF,
  LECTURE_EXPERT_RECIPE_ID,
  LECTURE_ONE_PASS_AF,
  LECTURE_SILENCE_AF,
  LECTURE_SPEECH_AF,
  WAN_NANO_RECIPE_ID,
  describeRecipe,
  isLectureExpertRecipeId,
  thumbnailSeekSeconds,
} from "./expert-recipe";

describe("wan_nano_v1 recipe", () => {
  it("pins the new recipe id and keeps 4.2-safe leftover filters", () => {
    expect(WAN_NANO_RECIPE_ID).toBe("wan_nano_v1");
    expect(isLectureExpertRecipeId("wan_nano_v1")).toBe(true);
    expect(isLectureExpertRecipeId("lecture_expert_v1")).toBe(true);
    expect(isLectureExpertRecipeId("owned_abc")).toBe(false);
    expect(LECTURE_EXPERT_RECIPE_ID).toBe("lecture_expert_v1");
    expect(LECTURE_ENHANCE_VF).toContain("hqdn3d=1.2:1.0:4:4");
    expect(LECTURE_SPEECH_AF).toContain("highpass=f=90");
    expect(LECTURE_SILENCE_AF).toContain("start_duration=0.45");
    expect(LECTURE_ONE_PASS_AF.indexOf("silenceremove=")).toBeLessThan(LECTURE_ONE_PASS_AF.indexOf("loudnorm="));
  });

  it("only lists Nano Banana, Wan replace, and original audio", () => {
    const recipe = describeRecipe({ wan: false, nanoBanana: false, fal: false, dashscope: false });
    expect(recipe.recipeId).toBe(WAN_NANO_RECIPE_ID);
    expect(recipe.techniques.map((row) => row.id)).toEqual(["nano_banana", "wan_replace", "keep_audio"]);
    expect(recipe.techniques.find((row) => row.id === "wan_replace")?.status).toBe("skipped");
    expect(recipe.techniques.find((row) => row.id === "keep_audio")?.status).toBe("applied");
    expect(recipe.techniques.some((row) => row.id === "avatar_presenter")).toBe(false);
    expect(recipe.techniques.some((row) => row.id === "toon_restyle")).toBe(false);
  });

  it("marks Fal replace applied", () => {
    const recipe = describeRecipe(
      { wan: true, nanoBanana: true, fal: true, dashscope: false },
      { stillSource: "nano_banana", characterReplace: "fal", audioKept: true },
    );
    expect(recipe.techniques.find((row) => row.id === "nano_banana")?.status).toBe("applied");
    expect(recipe.techniques.find((row) => row.id === "wan_replace")?.status).toBe("applied");
    expect(recipe.techniques.find((row) => row.id === "wan_replace")?.note).toMatch(/Fal/);
  });

  it("picks a cover frame at 25% and away from the start", () => {
    expect(thumbnailSeekSeconds(0)).toBe(1.2);
    expect(thumbnailSeekSeconds(40_000)).toBe(10);
    expect(thumbnailSeekSeconds(80_000)).toBe(12);
    expect(thumbnailSeekSeconds(4_000)).toBe(1.2);
  });
});
