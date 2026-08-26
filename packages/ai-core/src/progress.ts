export const AI_EDIT_STEPS = [
  { id: "upload", label: "Đang tải video lên máy chủ", percent: 8 },
  { id: "queue", label: "Đã nhận video — xếp hàng chỉnh", percent: 12 },
  { id: "source", label: "Đang đọc file gốc", percent: 18 },
  { id: "enhance", label: "Đang làm nét hình và giảm nhạc nền", percent: 32 },
  { id: "toon", label: "Đang chỉnh mặt / hình PIP", percent: 46 },
  { id: "trim", label: "Đang cắt đoạn im lặng", percent: 54 },
  { id: "edition", label: "Đang dựng bản minh họa (tiếng gốc)", percent: 72 },
  { id: "extras", label: "Đang tạo ảnh bìa, phụ đề và mô tả", percent: 84 },
  { id: "apply", label: "Đang gắn video vào bài học", percent: 94 },
  { id: "done", label: "Xong — sẵn sàng lưu vào bài", percent: 100 },
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
