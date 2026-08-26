import type { AiCapabilities } from "./catalog";

export const LECTURE_EXPERT_RECIPE_ID = "lecture_expert_v1";

export const LECTURE_ENHANCE_VF =
  "hqdn3d=1.2:1.0:4:4,unsharp=3:3:0.35:3:3:0.0,eq=contrast=1.04:brightness=0.012:saturation=1.04:gamma=1.01,scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p,setsar=1";

export const LECTURE_SPEECH_CLEAN_AF =
  "highpass=f=90,lowpass=f=7500,equalizer=f=250:t=q:w=1.2:g=-2,equalizer=f=3000:t=q:w=1.2:g=2,afftdn=nf=-24";

export const LECTURE_LOUDNORM_AF = "loudnorm=I=-16:TP=-1.5:LRA=11";

export const LECTURE_SILENCE_AF =
  "silenceremove=start_periods=1:start_duration=0.45:start_threshold=-38dB:stop_periods=-1:stop_duration=0.7:stop_threshold=-38dB";

/** Standalone speech tools — same sound as before, no silence cut. */
export const LECTURE_SPEECH_AF = `${LECTURE_SPEECH_CLEAN_AF},${LECTURE_LOUDNORM_AF}`;

/** One encode: clean speech, conservative silence, then loudness. */
export const LECTURE_ONE_PASS_AF = `${LECTURE_SPEECH_CLEAN_AF},${LECTURE_SILENCE_AF},${LECTURE_LOUDNORM_AF}`;

export type RecipeTechniqueStatus = "applied" | "skipped" | "refused";

export interface RecipeTechnique {
  id: string;
  source: string;
  status: RecipeTechniqueStatus;
  label: string;
  note?: string;
}

export interface RecipeOutcome {
  trimApplied?: boolean;
  toonApplied?: boolean;
  captionsMode?: "whisper" | "heuristic" | "failed";
  copyMode?: "llm" | "heuristic" | "failed";
  thumbApplied?: boolean;
}

export interface LectureExpertRecipe {
  recipeId: typeof LECTURE_EXPERT_RECIPE_ID;
  techniques: RecipeTechnique[];
}

export function isLectureExpertRecipeId(value: string): boolean {
  return value === LECTURE_EXPERT_RECIPE_ID;
}

export function thumbnailSeekSeconds(durationMs: number): number {
  if (!Number.isFinite(durationMs) || durationMs <= 0) return 1.2;
  return Math.min(12, Math.max(1.2, (durationMs / 1000) * 0.25));
}

export function describeRecipe(caps: Pick<AiCapabilities, "speech" | "imageGen" | "llm">, outcome: RecipeOutcome = {}): LectureExpertRecipe {
  const captionsStatus: RecipeTechniqueStatus =
    outcome.captionsMode === "failed" ? "skipped" : caps.speech && outcome.captionsMode !== "heuristic" ? "applied" : "skipped";
  const copyStatus: RecipeTechniqueStatus =
    outcome.copyMode === "failed" ? "skipped" : caps.llm && outcome.copyMode !== "heuristic" ? "applied" : "skipped";
  const trimStatus: RecipeTechniqueStatus = outcome.trimApplied === false ? "skipped" : "applied";
  const toonStatus: RecipeTechniqueStatus = outcome.toonApplied === false ? "skipped" : "applied";
  const thumbStatus: RecipeTechniqueStatus = outcome.thumbApplied === false ? "skipped" : "applied";

  return {
    recipeId: LECTURE_EXPERT_RECIPE_ID,
    techniques: [
      {
        id: "studio_sound",
        source: "Descript Studio Sound / Adobe Enhance Speech",
        status: "applied",
        label: "Lọc tạp và cân âm lượng lời giảng",
      },
      {
        id: "auto_color",
        source: "Premiere Auto Color / CapCut Enhance",
        status: "applied",
        label: "Làm nét nhẹ, an toàn cho slide",
      },
      {
        id: "silence_trim",
        source: "Descript / CapCut silence remove",
        status: trimStatus,
        label: "Cắt khoảng lặng dài",
        note: trimStatus === "skipped" ? "ffmpeg không cắt được — giữ nguyên độ dài." : undefined,
      },
      {
        id: "captions",
        source: "CapCut / VEED / chuẩn Netflix–YouTube",
        status: captionsStatus,
        label: "Phụ đề 2 dòng, tối đa 42 ký tự",
        note:
          captionsStatus === "skipped"
            ? "Chưa có khóa Whisper — VTT nháp từ tiêu đề, không giả transcript."
            : undefined,
      },
      {
        id: "thumbnail",
        source: "YouTube / CapCut cover",
        status: thumbStatus,
        label: "Ảnh bìa ở 25% thời lượng, tránh frame đen đầu clip",
      },
      {
        id: "lesson_copy",
        source: "Descript / GPT lesson copy",
        status: copyStatus,
        label: "Gợi ý tiêu đề và mô tả bài",
        note: copyStatus === "skipped" ? "Chưa có khóa LLM — mô tả từ tiêu đề." : undefined,
      },
      {
        id: "illustrated_edition",
        source: "Pictory scene cards",
        status: "skipped",
        label: "Bản minh họa Ken Burns trên tiếng gốc",
        note: "Không tự dựng trong auto-publish — tránh mất hình giáo viên. Chạy thủ công nếu cần.",
      },
      {
        id: "toon_restyle",
        source: "DomoAI / CapCut Restyle / Runway Aleph",
        status: toonStatus,
        label: "Tô người thành hoạt hình",
        note:
          toonStatus === "skipped"
            ? "ffmpeg không tô được — giữ bản làm nét, slide và tiếng gốc."
            : "Tô người giữa khung ngay sau khi tải lên — giữ slide và tiếng gốc.",
      },
      {
        id: "avatar_presenter",
        source: "HeyGen / Synthesia",
        status: "skipped",
        label: "Người dẫn ảo từ kịch bản",
        note: "Không mặc định. Chạy thủ công trong studio — cần xác nhận người ảo / ảnh hợp lệ.",
      },
      {
        id: "video_translate",
        source: "HeyGen Video Translate",
        status: "skipped",
        label: "Dịch / lồng tiếng",
        note: "Không mặc định. HeyGen lip-sync hoặc lồng tiếng trên máy.",
      },
      {
        id: "eye_contact",
        source: "Descript Eye Contact",
        status: "skipped",
        label: "Canh mắt nhìn camera",
        note: "Không mặc định. Bản trên máy canh mặt, không warp ngươi mắt.",
      },
      {
        id: "overdub",
        source: "Descript Overdub / ElevenLabs",
        status: "skipped",
        label: "Sửa câu bằng giọng",
        note: "Không mặc định. Chỉ clone giọng bạn sở hữu.",
      },
      {
        id: "filler_cut",
        source: "Descript filler / Overdub / Eye Contact",
        status: "refused",
        label: "Cắt um/à và sửa lời",
        note: "Cần word-level Whisper và model mặt.",
      },
      {
        id: "shorts_reframe",
        source: "OpusClip / Submagic",
        status: "refused",
        label: "Cắt short 9:16, chữ nhảy",
        note: "Sai hình khóa học ngang.",
      },
      {
        id: "v2v",
        source: "Runway / Firefly / Sora",
        status: "refused",
        label: "Sinh hoặc biến hình video bằng GPU",
        note: "Máy chủ không có GPU/key Runway.",
      },
      {
        id: "content_id_dodge",
        source: "—",
        status: "refused",
        label: "Né Content ID",
        note: "Cấm. Giảm nhạc nền không xóa bản quyền nội dung người khác.",
      },
    ],
  };
}
