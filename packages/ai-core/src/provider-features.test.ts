import { describe, expect, it } from "vitest";
import { NANO_BANANA_MODEL } from "./nano-banana";
import { WAN_FAL_MODEL } from "./wan";
import {
  FAL_WAN_I2V_MODEL,
  FAL_WAN_MOVE_MODEL,
  FAL_WAN_REPLACE_MODEL,
  FAL_WAN_S2V_MODEL,
  LECTURE_AUTO_PIPELINE,
  NANO_BANANA_2_LITE_MODEL,
  NANO_BANANA_2_MODEL,
  NANO_BANANA_PRO_MODEL,
  PROVIDER_FEATURES,
  fallbackOnUploadFeatureIds,
  getProviderFeature,
  isProviderFeatureId,
  lectureAutoFeatureIds,
  presentProviderFeatures,
  reservedProviderFeatures,
} from "./provider-features";

const CAPS = {
  fal: true,
  dashscope: false,
  nanoBanana: true,
  wan: true,
  ffmpeg: true,
};

describe("Wan / Fal / Nano Banana feature catalog", () => {
  it("locks the lecture auto path to still + Fal replace + original audio", () => {
    expect(lectureAutoFeatureIds()).toEqual([
      "nano_banana_still",
      "fal_storage_upload",
      "fal_queue",
      "fal_wan_replace",
      "keep_original_audio",
    ]);
    expect(LECTURE_AUTO_PIPELINE.map((step) => step.id)).toEqual([
      "nano_banana_still",
      "fal_storage_upload",
      "fal_wan_replace",
      "keep_original_audio",
    ]);
    expect(fallbackOnUploadFeatureIds()).toEqual(["dashscope_wan_replace"]);
    expect(FAL_WAN_REPLACE_MODEL).toBe(WAN_FAL_MODEL);
    expect(getProviderFeature("nano_banana_still")?.modelId).toBe(NANO_BANANA_MODEL);
  });

  it("keeps motion-inventing Wan and Gemini 3 models reserved", () => {
    const reservedIds = reservedProviderFeatures().map((feature) => feature.id);
    expect(reservedIds).toEqual(
      expect.arrayContaining([
        "fal_wan_move",
        "fal_wan_speech_to_video",
        "fal_wan_image_to_video",
        "nano_banana_edit_still",
        "nano_banana_2_lite_still",
        "nano_banana_2_still",
        "nano_banana_pro_still",
        "nano_banana_video_to_image",
        "nano_banana_search_grounding",
      ]),
    );
    for (const id of ["fal_wan_move", "fal_wan_speech_to_video", "fal_wan_image_to_video"] as const) {
      const feature = getProviderFeature(id);
      expect(feature?.status).toBe("reserved");
      expect(feature?.usedOnUpload).toBe(false);
      expect(feature?.keepsLectureAudio).toBe(false);
    }
    expect(getProviderFeature("fal_wan_move")?.modelId).toBe(FAL_WAN_MOVE_MODEL);
    expect(getProviderFeature("fal_wan_speech_to_video")?.modelId).toBe(FAL_WAN_S2V_MODEL);
    expect(getProviderFeature("fal_wan_image_to_video")?.modelId).toBe(FAL_WAN_I2V_MODEL);
    expect(getProviderFeature("nano_banana_2_lite_still")?.modelId).toBe(NANO_BANANA_2_LITE_MODEL);
    expect(getProviderFeature("nano_banana_2_still")?.modelId).toBe(NANO_BANANA_2_MODEL);
    expect(getProviderFeature("nano_banana_pro_still")?.modelId).toBe(NANO_BANANA_PRO_MODEL);
    expect(isProviderFeatureId("fal_wan_replace")).toBe(true);
    expect(isProviderFeatureId("ken_burns")).toBe(false);
    expect(getProviderFeature("ken_burns")).toBeNull();
  });

  it("marks readiness from env capabilities without enabling reserved work", () => {
    const presented = presentProviderFeatures(CAPS);
    expect(presented.autoOnUpload).toEqual(lectureAutoFeatureIds());
    expect(presented.fallbackOnUpload).toEqual(["dashscope_wan_replace"]);
    expect(presented.features.find((row) => row.id === "fal_wan_replace")?.ready).toBe(true);
    expect(presented.features.find((row) => row.id === "dashscope_wan_replace")?.ready).toBe(false);
    expect(presented.features.find((row) => row.id === "nano_banana_2_still")?.ready).toBe(true);
    expect(presented.features.find((row) => row.id === "nano_banana_2_still")?.usedOnUpload).toBe(false);
    const noFal = presentProviderFeatures({ ...CAPS, fal: false, dashscope: true, nanoBanana: false });
    expect(noFal.features.find((row) => row.id === "fal_wan_replace")?.ready).toBe(false);
    expect(noFal.features.find((row) => row.id === "dashscope_wan_replace")?.ready).toBe(true);
    expect(noFal.features.find((row) => row.id === "nano_banana_still")?.ready).toBe(false);
    expect(PROVIDER_FEATURES.filter((feature) => feature.status === "wired_auto").every((feature) => feature.usedOnUpload)).toBe(
      true,
    );
  });
});
