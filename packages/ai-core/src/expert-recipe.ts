import type { AiCapabilities } from "./catalog";

export const LECTURE_EXPERT_RECIPE_ID = "lecture_expert_v1";
export const WAN_NANO_RECIPE_ID = "wan_nano_v1";

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
  stillSource?: "saved" | "nano_banana" | "failed";
  characterReplace?: false | "fal" | "dashscope";
  audioKept?: boolean;
}

export interface LectureExpertRecipe {
  recipeId: typeof WAN_NANO_RECIPE_ID | typeof LECTURE_EXPERT_RECIPE_ID;
  techniques: RecipeTechnique[];
}

export function isLectureExpertRecipeId(value: string): boolean {
  return value === WAN_NANO_RECIPE_ID || value === LECTURE_EXPERT_RECIPE_ID;
}

export function thumbnailSeekSeconds(durationMs: number): number {
  if (!Number.isFinite(durationMs) || durationMs <= 0) return 1.2;
  return Math.min(12, Math.max(1.2, (durationMs / 1000) * 0.25));
}

export function describeRecipe(
  caps: Pick<AiCapabilities, "wan" | "nanoBanana" | "fal" | "dashscope">,
  outcome: RecipeOutcome = {},
): LectureExpertRecipe {
  const stillStatus: RecipeTechniqueStatus =
    outcome.stillSource === "failed" ? "skipped" : outcome.stillSource === "saved" || outcome.stillSource === "nano_banana" || caps.nanoBanana ? "applied" : "skipped";
  const replaced = outcome.characterReplace === "fal" || outcome.characterReplace === "dashscope";
  const wanStatus: RecipeTechniqueStatus = replaced || caps.wan ? "applied" : "skipped";
  const audioStatus: RecipeTechniqueStatus = outcome.audioKept === false ? "skipped" : "applied";

  return {
    recipeId: WAN_NANO_RECIPE_ID,
    techniques: [
      {
        id: "nano_banana",
        source: "Google Gemini / Nano Banana (gemini-2.5-flash-image)",
        status: stillStatus,
        label: "Ảnh nhân vật Nano Banana",
        note:
          outcome.stillSource === "saved"
            ? "Dùng ảnh https đã lưu — không vẽ lại."
            : outcome.stillSource === "nano_banana"
              ? "Đã vẽ một ảnh nhân vật bằng Nano Banana (Gemini image)."
              : stillStatus === "skipped"
                ? "Chưa có ảnh nhân vật và chưa có GEMINI_API_KEY."
                : "Sẽ vẽ ảnh nhân vật bằng Nano Banana nếu chưa có ảnh https.",
      },
      {
        id: "wan_replace",
        source: "Wan 2.2 Animate Replace (Fal / DashScope)",
        status: wanStatus,
        label: "Wan 2.2 thay người trong video",
        note: replaced
          ? outcome.characterReplace === "fal"
            ? "Fal Wan 2.2 animate replace — giữ chuyển động, thay nhân vật, ghép tiếng gốc."
            : "DashScope Wan 2.2 animate-mix — giữ chuyển động, thay nhân vật, ghép tiếng gốc."
          : caps.wan
            ? "Sẽ gọi Wan 2.2 trên từng đoạn 20 giây. Không có khóa thì không chạy."
            : "Chưa có FAL_KEY hoặc DASHSCOPE_API_KEY — không thay người được.",
      },
      {
        id: "keep_audio",
        source: "ffmpeg mux tiếng gốc",
        status: audioStatus,
        label: "Giữ 100% tiếng bài giảng gốc",
        note: audioStatus === "applied" ? "Wan chỉ sửa hình. Tiếng lấy lại từ file gốc." : "Không ghép được tiếng gốc.",
      },
    ],
  };
}
