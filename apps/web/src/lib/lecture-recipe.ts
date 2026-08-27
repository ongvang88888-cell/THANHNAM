export const PIPELINE_STEPS = [
  { id: "upload", label: "Đang tải video lên máy chủ", percent: 8 },
  { id: "queue", label: "Đã nhận video — xếp hàng chỉnh", percent: 12 },
  { id: "source", label: "Đang đọc file gốc", percent: 18 },
  { id: "enhance", label: "Đang làm nét hình và giảm nhạc nền", percent: 36 },
  { id: "trim", label: "Đang cắt đoạn im lặng", percent: 48 },
  { id: "toon", label: "Đang tô đậm người thành hoạt hình", percent: 68 },
  { id: "character", label: "Đang thay người bằng nhân vật AI", percent: 74 },
  { id: "extras", label: "Đang tạo ảnh bìa, phụ đề và mô tả", percent: 82 },
  { id: "apply", label: "Đang gắn video vào bài học", percent: 92 },
  { id: "done", label: "Xong — sẵn sàng lưu vào bài", percent: 100 },
] as const;

export type PipelineStepId = (typeof PIPELINE_STEPS)[number]["id"];
export type RecipeStatus = "applied" | "skipped" | "refused";
export type RecipeRow = { id: string; status: RecipeStatus; label: string; note?: string };

export const RECIPE_CHECKLIST: RecipeRow[] = [
  { id: "studio_sound", status: "applied", label: "Lọc tạp và cân âm lượng lời giảng" },
  { id: "auto_color", status: "applied", label: "Làm nét nhẹ, an toàn cho slide" },
  { id: "silence_trim", status: "applied", label: "Cắt khoảng lặng dài" },
  { id: "captions", status: "skipped", label: "Phụ đề 2 dòng, tối đa 42 ký tự", note: "Chưa có khóa Whisper — VTT nháp từ tiêu đề." },
  { id: "thumbnail", status: "applied", label: "Ảnh bìa ở 25% thời lượng, tránh frame đen đầu clip" },
  { id: "lesson_copy", status: "skipped", label: "Gợi ý tiêu đề và mô tả bài", note: "Chưa có khóa LLM — mô tả từ tiêu đề." },
  { id: "illustrated_edition", status: "skipped", label: "Bản minh họa Ken Burns trên tiếng gốc", note: "Không tự dựng — tránh mất hình giáo viên." },
  { id: "toon_restyle", status: "skipped", label: "Tô đậm người thành hoạt hình (trên máy)", note: "Đã che người bằng nhân vật — không tô người thật." },
  { id: "avatar_presenter", status: "applied", label: "Người dẫn ảo thay người trong bài", note: "Tự chạy trên mọi video tải lên. Không khóa HeyGen: thẻ nhân vật trên máy che người gốc, giữ tiếng." },
  { id: "hailuo_character", status: "skipped", label: "Nhân vật 3D Hailuo thay người trong bài", note: "Tự chạy nếu chưa có HeyGen nhưng có cùng một ảnh + MINIMAX_API_KEY." },
  { id: "veo_intro", status: "skipped", label: "Clip mở bài Veo 8 giây", note: "Không tự chạy. Cần khóa Gemini/Veo trả phí." },
  { id: "video_translate", status: "skipped", label: "Dịch / lồng tiếng", note: "Không tự chạy. HeyGen lip-sync hoặc lồng tiếng trên máy." },
  { id: "eye_contact", status: "skipped", label: "Canh mắt nhìn camera", note: "Không tự chạy. Bản trên máy canh mặt, không warp ngươi." },
  { id: "overdub", status: "skipped", label: "Sửa câu bằng giọng", note: "Không tự chạy. Chỉ clone giọng bạn sở hữu." },
  { id: "filler_cut", status: "refused", label: "Cắt um/à và sửa lời", note: "Cần word-level Whisper." },
  { id: "shorts_reframe", status: "refused", label: "Cắt short 9:16, chữ nhảy", note: "Sai hình khóa học ngang." },
  { id: "v2v", status: "refused", label: "Sinh hoặc biến hình video bằng GPU", note: "Máy chủ không có khóa Kling/Dreamina/Fal/Runway — không làm được video AI trend 3D như YouTube." },
  { id: "content_id_dodge", status: "refused", label: "Né Content ID", note: "Cấm. Giảm nhạc nền không xóa bản quyền." },
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
