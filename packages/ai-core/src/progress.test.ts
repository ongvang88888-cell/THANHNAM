import { describe, expect, it } from "vitest";
import {
  AI_EDIT_STEPS,
  getAiEditStep,
  isAiEditStepId,
  progressFields,
  progressForStatus,
  wanChunkProgress,
} from "./progress";

describe("AI edit progress steps", () => {
  it("exposes the Wan + Nano Banana pipeline", () => {
    expect(AI_EDIT_STEPS.map((step) => step.id)).toEqual([
      "upload",
      "queue",
      "source",
      "still",
      "replace",
      "stitch",
      "apply",
      "done",
    ]);
    expect(AI_EDIT_STEPS[0]?.percent).toBeGreaterThan(0);
    expect(AI_EDIT_STEPS.at(-1)?.percent).toBe(100);
    const percents = AI_EDIT_STEPS.map((step) => step.percent);
    expect(percents).toEqual([...percents].sort((a, b) => a - b));
  });

  it("looks up labels and percents by step id", () => {
    expect(isAiEditStepId("still")).toBe(true);
    expect(isAiEditStepId("toon")).toBe(false);
    expect(isAiEditStepId("enhance")).toBe(false);
    expect(getAiEditStep("apply")?.label).toMatch(/gắn video/i);
    expect(progressFields("replace")).toEqual({
      progress: 62,
      step: "replace",
      stepLabel: "Đang thay người bằng Wan 2.2",
    });
    expect(progressFields("stitch").stepLabel).toMatch(/tiếng gốc/i);
    expect(wanChunkProgress(0, 4)).toBeGreaterThan(28);
    expect(wanChunkProgress(3, 4)).toBe(82);
  });

  it("maps edit status to a default step", () => {
    expect(progressForStatus("QUEUED").step).toBe("queue");
    expect(progressForStatus("PROCESSING").step).toBe("source");
    expect(progressForStatus("READY").step).toBe("done");
  });
});
