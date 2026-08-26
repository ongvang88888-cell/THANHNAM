import { describe, expect, it } from "vitest";
import {
  LECTURE_ENHANCE_VF,
  LECTURE_EXPERT_RECIPE_ID,
  LECTURE_SILENCE_AF,
  LECTURE_SPEECH_AF,
  describeRecipe,
  isLectureExpertRecipeId,
  thumbnailSeekSeconds,
} from "./expert-recipe";

describe("lecture_expert_v1 recipe", () => {
  it("pins the recipe id and 4.2-safe filters", () => {
    expect(LECTURE_EXPERT_RECIPE_ID).toBe("lecture_expert_v1");
    expect(isLectureExpertRecipeId("lecture_expert_v1")).toBe(true);
    expect(isLectureExpertRecipeId("owned_abc")).toBe(false);
    expect(LECTURE_ENHANCE_VF).toContain("hqdn3d=1.2:1.0:4:4");
    expect(LECTURE_ENHANCE_VF).toContain("format=yuv420p");
    expect(LECTURE_SPEECH_AF).toContain("highpass=f=90");
    expect(LECTURE_SPEECH_AF).toContain("lowpass=f=7500");
    expect(LECTURE_SPEECH_AF).not.toContain("dynaudnorm");
    expect(LECTURE_SILENCE_AF).toContain("start_duration=0.45");
    expect(LECTURE_SILENCE_AF).not.toContain("start_silence");
  });

  it("marks applied, skipped, and refused techniques", () => {
    const recipe = describeRecipe({ speech: false, imageGen: false, llm: false });
    expect(recipe.recipeId).toBe(LECTURE_EXPERT_RECIPE_ID);
    expect(recipe.techniques.filter((row) => row.status === "applied").map((row) => row.id)).toEqual([
      "studio_sound",
      "auto_color",
      "silence_trim",
      "thumbnail",
    ]);
    expect(recipe.techniques.find((row) => row.id === "captions")?.status).toBe("skipped");
    expect(recipe.techniques.find((row) => row.id === "toon_restyle")?.status).toBe("skipped");
    expect(recipe.techniques.find((row) => row.id === "illustrated_edition")?.status).toBe("skipped");
    expect(recipe.techniques.find((row) => row.id === "v2v")?.status).toBe("refused");
    expect(recipe.techniques.find((row) => row.id === "content_id_dodge")?.status).toBe("refused");
  });

  it("promotes captions and copy when keys and outcomes exist", () => {
    const recipe = describeRecipe(
      { speech: true, imageGen: false, llm: true },
      { captionsMode: "whisper", copyMode: "llm", trimApplied: true, thumbApplied: true },
    );
    expect(recipe.techniques.find((row) => row.id === "captions")?.status).toBe("applied");
    expect(recipe.techniques.find((row) => row.id === "lesson_copy")?.status).toBe("applied");
  });

  it("picks a cover frame at 25% and away from the start", () => {
    expect(thumbnailSeekSeconds(0)).toBe(1.2);
    expect(thumbnailSeekSeconds(40_000)).toBe(10);
    expect(thumbnailSeekSeconds(80_000)).toBe(12);
    expect(thumbnailSeekSeconds(4_000)).toBe(1.2);
  });
});
