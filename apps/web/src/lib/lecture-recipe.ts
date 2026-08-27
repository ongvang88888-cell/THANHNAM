export const PIPELINE_STEPS = [
  { id: "upload", label: "Đang tải video lên máy chủ", percent: 8 },
  { id: "queue", label: "Đã nhận video — xếp hàng Wan 2.2", percent: 12 },
  { id: "source", label: "Đang đọc file gốc", percent: 18 },
  { id: "still", label: "Đang lấy / vẽ ảnh nhân vật Nano Banana", percent: 28 },
  { id: "replace", label: "Đang thay người bằng Wan 2.2", percent: 62 },
  { id: "stitch", label: "Đang ghép đoạn và tiếng gốc", percent: 82 },
  { id: "apply", label: "Đang gắn video vào bài học", percent: 92 },
  { id: "done", label: "Xong — đã gắn vào bài", percent: 100 },
] as const;

export type PipelineStepId = (typeof PIPELINE_STEPS)[number]["id"];
export type RecipeStatus = "applied" | "skipped" | "refused";
export type RecipeRow = { id: string; status: RecipeStatus; label: string; note?: string };

/** Client poll budget — Wan 2.2 chạy từng đoạn ~20 giây, bài dài có thể rất lâu. */
export const WAN_EDIT_POLL_MS = 90 * 60 * 1000;

export const RECIPE_CHECKLIST: RecipeRow[] = [
  {
    id: "nano_banana",
    status: "skipped",
    label: "Ảnh nhân vật Nano Banana",
    note: "Cần ảnh https đã lưu, hoặc GEMINI_API_KEY để vẽ. Không dùng thẻ chữ / Ken Burns.",
  },
  {
    id: "wan_replace",
    status: "skipped",
    label: "Wan 2.2 thay người trong video",
    note: "Cần FAL_KEY hoặc DASHSCOPE_API_KEY. Không có khóa thì không chạy — không tô hoạt hình trên máy.",
  },
  {
    id: "keep_audio",
    status: "applied",
    label: "Giữ 100% tiếng bài giảng gốc",
    note: "Wan chỉ sửa hình. Tiếng lấy lại từ file gốc.",
  },
];

export const RECIPE_STATUS_LABEL: Record<RecipeStatus, string> = {
  applied: "Đã áp",
  skipped: "Bỏ qua",
  refused: "Không làm",
};

export function pipelineStepById(id: string | undefined) {
  return PIPELINE_STEPS.find((step) => step.id === id);
}

export function pipelineIndex(id: string | undefined): number {
  const index = PIPELINE_STEPS.findIndex((step) => step.id === id);
  return index >= 0 ? index : 0;
}
