import { describe, expect, it } from "vitest";
import {
  AI_EDIT_STEPS,
  getAiEditStep,
  isAiEditStepId,
  progressFields,
  progressForStatus,
} from "./progress";

describe("AI edit progress steps", () => {
  it("exposes a complete owned-upload pipeline", () => {
    expect(AI_EDIT_STEPS.map((step) => step.id)).toEqual([
      "upload",
      "queue",
      "source",
      "enhance",
      "toon",
      "trim",
      "edition",
      "extras",
      "apply",
      "done",
    ]);
    expect(AI_EDIT_STEPS[0]?.percent).toBeGreaterThan(0);
    expect(AI_EDIT_STEPS.at(-1)?.percent).toBe(100);
    const percents = AI_EDIT_STEPS.map((step) => step.percent);
    expect(percents).toEqual([...percents].sort((a, b) => a - b));
  });

  it("looks up labels and percents by step id", () => {
    expect(isAiEditStepId("enhance")).toBe(true);
    expect(isAiEditStepId("render")).toBe(false);
    expect(getAiEditStep("apply")?.label).toMatch(/gắn video/i);
    expect(progressFields("extras")).toEqual({
      progress: 84,
      step: "extras",
      stepLabel: "Đang tạo ảnh bìa, phụ đề và mô tả",
    });
  });

  it("maps edit status to a default step", () => {
    expect(progressForStatus("QUEUED").step).toBe("queue");
    expect(progressForStatus("PROCESSING").step).toBe("source");
    expect(progressForStatus("READY").step).toBe("done");
  });
});
