export const AI_EDIT_STEPS = [
  { id: "upload", label: "Đang tải video lên máy chủ", percent: 8 },
  { id: "queue", label: "Đã nhận video — xếp hàng Wan 2.2", percent: 12 },
  { id: "source", label: "Đang đọc file gốc", percent: 18 },
  { id: "still", label: "Đang lấy / vẽ ảnh nhân vật Nano Banana", percent: 28 },
  { id: "replace", label: "Đang thay người bằng Wan 2.2", percent: 62 },
  { id: "stitch", label: "Đang ghép đoạn và tiếng gốc", percent: 82 },
  { id: "apply", label: "Đang gắn video vào bài học", percent: 92 },
  { id: "done", label: "Xong — đã gắn vào bài", percent: 100 },
] as const;

export type AiEditStepId = (typeof AI_EDIT_STEPS)[number]["id"];

export type AiEditProgress = {
  progress: number;
  step: AiEditStepId;
  stepLabel: string;
};

const BY_ID = new Map<string, (typeof AI_EDIT_STEPS)[number]>(
  AI_EDIT_STEPS.map((step) => [step.id, step]),
);

export function isAiEditStepId(value: string): value is AiEditStepId {
  return BY_ID.has(value);
}

export function getAiEditStep(id: string): (typeof AI_EDIT_STEPS)[number] | undefined {
  return BY_ID.get(id);
}

export function progressFields(stepId: AiEditStepId): AiEditProgress {
  const step = BY_ID.get(stepId);
  if (!step) {
    throw new Error(`Bước chỉnh video không hợp lệ: ${stepId}`);
  }
  return { progress: step.percent, step: step.id, stepLabel: step.label };
}

export function progressForStatus(status: string): AiEditProgress {
  switch (status) {
    case "QUEUED":
      return progressFields("queue");
    case "PROCESSING":
      return progressFields("source");
    case "READY":
      return progressFields("done");
    default:
      return progressFields("upload");
  }
}

export function wanChunkProgress(index: number, total: number): number {
  const start = 28;
  const end = 82;
  if (total <= 0) return start;
  const ratio = Math.min(1, Math.max(0, (index + 1) / total));
  return Math.round(start + (end - start) * ratio);
}
