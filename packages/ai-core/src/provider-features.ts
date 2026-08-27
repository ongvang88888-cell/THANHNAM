import type { AiCapabilities } from "./catalog";
import { NANO_BANANA_FALLBACK_MODEL, NANO_BANANA_MODEL } from "./nano-banana";
import { WAN_DASHSCOPE_MODEL, WAN_FAL_MODEL } from "./wan";

export const FAL_AUTH_HEADER = "Authorization: Key $FAL_KEY";
export const FAL_QUEUE_HOST = "https://queue.fal.run";
export const FAL_RUN_HOST = "https://fal.run";
export const FAL_STORAGE_INITIATE = "https://rest.alpha.fal.ai/storage/upload/initiate";

export const FAL_WAN_REPLACE_MODEL = WAN_FAL_MODEL;
export const FAL_WAN_MOVE_MODEL = "fal-ai/wan/v2.2-14b/animate/move";
export const FAL_WAN_S2V_MODEL = "fal-ai/wan/v2.2-14b/speech-to-video";
export const FAL_WAN_I2V_MODEL = "fal-ai/wan/v2.2-a14b/image-to-video";

export const FAL_WAN_RESOLUTIONS = ["480p", "580p", "720p"] as const;
export const FAL_WAN_VIDEO_QUALITIES = ["low", "medium", "high", "maximum"] as const;
export const FAL_WAN_WRITE_MODES = ["fast", "balanced", "small"] as const;

export const GEMINI_GENERATE_CONTENT_HOST = "https://generativelanguage.googleapis.com/v1beta/models";
export const GEMINI_INTERACTIONS_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";

/** Official Nano Banana family (Google image-gen docs). App upload still uses NANO_BANANA_MODEL. */
export const NANO_BANANA_2_LITE_MODEL = "gemini-3.1-flash-lite-image";
export const NANO_BANANA_2_MODEL = "gemini-3.1-flash-image";
export const NANO_BANANA_PRO_MODEL = "gemini-3-pro-image";

export const WAN_OFFICIAL_ANIMATE_DOCS = "https://huggingface.co/Wan-AI/Wan2.2-Animate-14B";
export const FAL_WAN_REPLACE_DOCS = "https://fal.ai/models/fal-ai/wan/v2.2-14b/animate/replace/api";
export const GEMINI_IMAGE_GEN_DOCS = "https://ai.google.dev/gemini-api/docs/image-generation";
export const GEMINI_GENERATE_CONTENT_IMAGE_DOCS = "https://ai.google.dev/gemini-api/docs/generate-content/image-generation";

export type FalWanResolution = (typeof FAL_WAN_RESOLUTIONS)[number];
export type ProviderVendor = "fal" | "gemini" | "dashscope" | "local";
export type ProviderFeatureStatus = "wired_auto" | "reserved";
export type ProviderFeatureKind =
  | "still"
  | "edit_still"
  | "replace"
  | "move"
  | "speech_to_video"
  | "image_to_video"
  | "video_to_image"
  | "search_grounding"
  | "queue"
  | "storage"
  | "mux_audio";

export type ProviderFeatureId =
  | "nano_banana_still"
  | "fal_storage_upload"
  | "fal_queue"
  | "fal_wan_replace"
  | "keep_original_audio"
  | "dashscope_wan_replace"
  | "fal_wan_move"
  | "fal_wan_speech_to_video"
  | "fal_wan_image_to_video"
  | "nano_banana_edit_still"
  | "nano_banana_2_lite_still"
  | "nano_banana_2_still"
  | "nano_banana_pro_still"
  | "nano_banana_video_to_image"
  | "nano_banana_search_grounding";

export type ProviderFeature = {
  id: ProviderFeatureId;
  vendor: ProviderVendor;
  kind: ProviderFeatureKind;
  status: ProviderFeatureStatus;
  label: string;
  modelId: string | null;
  docsUrl: string;
  requiredInputs: readonly string[];
  optionalInputs: readonly string[];
  keepsLectureAudio: boolean;
  usedOnUpload: boolean;
  note: string;
};

export const WAN_OFFICIAL_ANIMATE_MODES = {
  replacement: "Swap the filmed person; keep scene lighting, color, and motion (Fal Replace).",
  animation: "A still character follows a driving video's motion (Fal Move). Does not keep the original scene.",
} as const;

/**
 * Exact lecture upload path. Do not add reserved models here.
 * Nano Banana still is skipped when a stable public https still already exists.
 */
export const LECTURE_AUTO_PIPELINE = [
  {
    id: "nano_banana_still",
    required: false,
    note: "Bỏ qua nếu đã có ảnh https ổn định. Không lưu signed URL hết hạn.",
  },
  {
    id: "fal_storage_upload",
    required: false,
    note: "Chỉ khi có FAL_KEY. Ảnh/đoạn video phải thành URL Fal đọc được.",
  },
  {
    id: "fal_wan_replace",
    required: true,
    note: "Ưu tiên Fal. Không có Fal thì dashscope_wan_replace. Cắt ~20s/đoạn.",
  },
  {
    id: "keep_original_audio",
    required: true,
    note: "Wan/Fal không được tin là giữ tiếng bài. Luôn mux audio gốc.",
  },
] as const;

export const PROVIDER_FEATURES: readonly ProviderFeature[] = [
  {
    id: "nano_banana_still",
    vendor: "gemini",
    kind: "still",
    status: "wired_auto",
    label: "Nano Banana vẽ ảnh nhân vật",
    modelId: NANO_BANANA_MODEL,
    docsUrl: GEMINI_IMAGE_GEN_DOCS,
    requiredInputs: ["text_prompt"],
    optionalInputs: ["aspect_ratio", "reference_images"],
    keepsLectureAudio: true,
    usedOnUpload: true,
    note: `Gemini native image gen. App gọi generateContent ${NANO_BANANA_MODEL}, fallback ${NANO_BANANA_FALLBACK_MODEL}, responseModalities TEXT+IMAGE. Ảnh có watermark SynthID. Không vẽ chữ/thẻ tên. Gemini 3 (Nano Banana 2/Pro) nằm ở reserved — không tự đổi model khi upload.`,
  },
  {
    id: "fal_storage_upload",
    vendor: "fal",
    kind: "storage",
    status: "wired_auto",
    label: "Fal storage upload",
    modelId: null,
    docsUrl: FAL_WAN_REPLACE_DOCS,
    requiredInputs: ["file_name", "content_type", "bytes"],
    optionalInputs: [],
    keepsLectureAudio: true,
    usedOnUpload: true,
    note: `POST ${FAL_STORAGE_INITIATE} rồi PUT upload_url. Dùng file_url https. Cũng nhận public https hoặc data URI.`,
  },
  {
    id: "fal_queue",
    vendor: "fal",
    kind: "queue",
    status: "wired_auto",
    label: "Fal queue submit / status / result",
    modelId: FAL_WAN_REPLACE_MODEL,
    docsUrl: "https://fal.ai/docs/documentation/model-apis/inference/queue",
    requiredInputs: ["video_url", "image_url"],
    optionalInputs: ["webhook_url"],
    keepsLectureAudio: false,
    usedOnUpload: true,
    note: `POST ${FAL_QUEUE_HOST}/${FAL_WAN_REPLACE_MODEL} với ${FAL_AUTH_HEADER}. Poll status rồi GET result { video: { url } }. Sync cũng có tại ${FAL_RUN_HOST}/…. Output thường không giữ tiếng bài giảng.`,
  },
  {
    id: "fal_wan_replace",
    vendor: "fal",
    kind: "replace",
    status: "wired_auto",
    label: "Wan 2.2 Animate Replace",
    modelId: FAL_WAN_REPLACE_MODEL,
    docsUrl: FAL_WAN_REPLACE_DOCS,
    requiredInputs: ["video_url", "image_url"],
    optionalInputs: [
      "guidance_scale",
      "resolution",
      "seed",
      "num_inference_steps",
      "shift",
      "video_quality",
      "video_write_mode",
      "use_turbo",
      "return_frames_zip",
      "enable_safety_checker",
      "enable_output_safety_checker",
    ],
    keepsLectureAudio: false,
    usedOnUpload: true,
    note: `${WAN_OFFICIAL_ANIMATE_MODES.replacement} Schema chính thức: resolution 480p|580p|720p (mặc định 480p), guidance_scale mặc định 1, num_inference_steps mặc định 20, shift 1–10 mặc định 5, video_quality low|medium|high|maximum (mặc định high), video_write_mode fast|balanced|small (mặc định balanced). Ảnh lệch tỷ lệ bị resize + center-crop. Cắt ~20s/đoạn (min 2s, max 28s).`,
  },
  {
    id: "keep_original_audio",
    vendor: "local",
    kind: "mux_audio",
    status: "wired_auto",
    label: "Ghép lại tiếng gốc bài giảng",
    modelId: "ffmpeg",
    docsUrl: FAL_WAN_REPLACE_DOCS,
    requiredInputs: ["wan_visuals", "original_audio"],
    optionalInputs: [],
    keepsLectureAudio: true,
    usedOnUpload: true,
    note: "Wan/Fal không được tin là giữ audio bài. App luôn mux tiếng gốc sau khi ghép đoạn.",
  },
  {
    id: "dashscope_wan_replace",
    vendor: "dashscope",
    kind: "replace",
    status: "reserved",
    label: "DashScope Wan 2.2 animate-mix",
    modelId: WAN_DASHSCOPE_MODEL,
    docsUrl: "https://www.alibabacloud.com/help/en/model-studio/get-api-key",
    requiredInputs: ["image_url", "video_url"],
    optionalInputs: ["mode"],
    keepsLectureAudio: false,
    usedOnUpload: true,
    note: "Dự phòng khi không có FAL_KEY. App gọi wan2.2-animate-mix, mode wan-std, X-DashScope-Async. Có Fal thì không dùng.",
  },
  {
    id: "fal_wan_move",
    vendor: "fal",
    kind: "move",
    status: "reserved",
    label: "Wan 2.2 Animate Move",
    modelId: FAL_WAN_MOVE_MODEL,
    docsUrl: "https://fal.ai/models/fal-ai/wan/v2.2-14b/animate/move/api",
    requiredInputs: ["video_url", "image_url"],
    optionalInputs: ["use_turbo", "resolution"],
    keepsLectureAudio: false,
    usedOnUpload: false,
    note: `${WAN_OFFICIAL_ANIMATE_MODES.animation} Không thay người trong cảnh gốc. Không tự chạy khi upload bài giảng.`,
  },
  {
    id: "fal_wan_speech_to_video",
    vendor: "fal",
    kind: "speech_to_video",
    status: "reserved",
    label: "Wan 2.2 Speech-to-Video",
    modelId: FAL_WAN_S2V_MODEL,
    docsUrl: "https://fal.ai/models/fal-ai/wan/v2.2-14b/speech-to-video/api",
    requiredInputs: ["image_url", "audio_url"],
    optionalInputs: ["prompt"],
    keepsLectureAudio: false,
    usedOnUpload: false,
    note: "Sinh video mới từ ảnh tĩnh + audio (miệng/cử chỉ theo tiếng). Không thay người trong bài giảng thật. Không tự chạy.",
  },
  {
    id: "fal_wan_image_to_video",
    vendor: "fal",
    kind: "image_to_video",
    status: "reserved",
    label: "Wan 2.2 A14B Image-to-Video",
    modelId: FAL_WAN_I2V_MODEL,
    docsUrl: "https://fal.ai/models/fal-ai/wan/v2.2-a14b/image-to-video/api",
    requiredInputs: ["image_url", "prompt"],
    optionalInputs: ["end_image_url", "resolution", "num_frames"],
    keepsLectureAudio: false,
    usedOnUpload: false,
    note: "Sinh clip mới từ ảnh + prompt. Không giữ chuyển động bài giảng. Không tự chạy.",
  },
  {
    id: "nano_banana_edit_still",
    vendor: "gemini",
    kind: "edit_still",
    status: "reserved",
    label: "Nano Banana sửa ảnh (text + ảnh)",
    modelId: NANO_BANANA_MODEL,
    docsUrl: GEMINI_GENERATE_CONTENT_IMAGE_DOCS,
    requiredInputs: ["text_prompt", "image"],
    optionalInputs: ["more_reference_images", "aspect_ratio", "image_size"],
    keepsLectureAudio: true,
    usedOnUpload: false,
    note: "generateContent: ảnh + chữ để sửa/giữ khuôn mặt. gemini-2.5-flash-image tối đa ~3 ảnh vào. Gemini 3 nhận nhiều ảnh tham chiếu hơn (tới 14). Chưa gắn vào upload.",
  },
  {
    id: "nano_banana_2_lite_still",
    vendor: "gemini",
    kind: "still",
    status: "reserved",
    label: "Nano Banana 2 Lite",
    modelId: NANO_BANANA_2_LITE_MODEL,
    docsUrl: GEMINI_IMAGE_GEN_DOCS,
    requiredInputs: ["text_prompt"],
    optionalInputs: ["aspect_ratio"],
    keepsLectureAudio: true,
    usedOnUpload: false,
    note: "Official: gemini-3.1-flash-lite-image — nhanh/rẻ. Không tối ưu multi-ref hay sửa nhiều lượt. Docs mới ưu tiên Interactions API. Không tự đổi model upload.",
  },
  {
    id: "nano_banana_2_still",
    vendor: "gemini",
    kind: "still",
    status: "reserved",
    label: "Nano Banana 2",
    modelId: NANO_BANANA_2_MODEL,
    docsUrl: GEMINI_IMAGE_GEN_DOCS,
    requiredInputs: ["text_prompt"],
    optionalInputs: ["aspect_ratio", "image_size", "reference_images"],
    keepsLectureAudio: true,
    usedOnUpload: false,
    note: "Official: gemini-3.1-flash-image — workhorse Gemini 3 image, 1K/2K/4K, tới 14 ảnh tham chiếu, có video-to-image. Interactions API trên docs mới. Không tự chạy khi upload.",
  },
  {
    id: "nano_banana_pro_still",
    vendor: "gemini",
    kind: "still",
    status: "reserved",
    label: "Nano Banana Pro",
    modelId: NANO_BANANA_PRO_MODEL,
    docsUrl: GEMINI_IMAGE_GEN_DOCS,
    requiredInputs: ["text_prompt"],
    optionalInputs: ["aspect_ratio", "image_size", "google_search", "reference_images"],
    keepsLectureAudio: true,
    usedOnUpload: false,
    note: "Official: gemini-3-pro-image — chất lượng cao, interleaved text+image. Không tự chạy khi upload.",
  },
  {
    id: "nano_banana_video_to_image",
    vendor: "gemini",
    kind: "video_to_image",
    status: "reserved",
    label: "Nano Banana 2 video → ảnh",
    modelId: NANO_BANANA_2_MODEL,
    docsUrl: GEMINI_IMAGE_GEN_DOCS,
    requiredInputs: ["text_prompt", "video"],
    optionalInputs: ["aspect_ratio", "image_size"],
    keepsLectureAudio: true,
    usedOnUpload: false,
    note: "Chỉ gemini-3.1-flash-image: video (upload hoặc YouTube public) + prompt → poster/thumbnail. Không thay người trong bài. Không tự chạy.",
  },
  {
    id: "nano_banana_search_grounding",
    vendor: "gemini",
    kind: "search_grounding",
    status: "reserved",
    label: "Nano Banana + Google Search",
    modelId: NANO_BANANA_2_MODEL,
    docsUrl: GEMINI_IMAGE_GEN_DOCS,
    requiredInputs: ["text_prompt", "google_search"],
    optionalInputs: ["aspect_ratio", "image_size"],
    keepsLectureAudio: true,
    usedOnUpload: false,
    note: "Grounding Search trước khi vẽ (thời tiết, sự kiện…). Không hỗ trợ trên gemini-3.1-flash-lite-image. Không tự chạy khi upload bài giảng.",
  },
];

export function lectureAutoFeatureIds(): ProviderFeatureId[] {
  return PROVIDER_FEATURES.filter((feature) => feature.status === "wired_auto" && feature.usedOnUpload).map(
    (feature) => feature.id,
  );
}

export function fallbackOnUploadFeatureIds(): ProviderFeatureId[] {
  return PROVIDER_FEATURES.filter((feature) => feature.status === "reserved" && feature.usedOnUpload).map(
    (feature) => feature.id,
  );
}

export function reservedProviderFeatures(): ProviderFeature[] {
  return PROVIDER_FEATURES.filter((feature) => feature.status === "reserved");
}

export function getProviderFeature(id: string): ProviderFeature | null {
  return PROVIDER_FEATURES.find((feature) => feature.id === id) ?? null;
}

export function isProviderFeatureId(id: string): id is ProviderFeatureId {
  return getProviderFeature(id) !== null;
}

function featureReady(
  feature: ProviderFeature,
  caps: Pick<AiCapabilities, "fal" | "dashscope" | "nanoBanana" | "wan" | "ffmpeg">,
): boolean {
  switch (feature.vendor) {
    case "fal":
      return caps.fal;
    case "gemini":
      return caps.nanoBanana;
    case "dashscope":
      return caps.dashscope;
    case "local":
      return caps.ffmpeg;
    default: {
      const _never: never = feature.vendor;
      return _never;
    }
  }
}

export type ProviderFeatureView = ProviderFeature & { ready: boolean };

export type ProviderFeatureCatalog = {
  autoOnUpload: ProviderFeatureId[];
  fallbackOnUpload: ProviderFeatureId[];
  features: ProviderFeatureView[];
};

export function presentProviderFeatures(
  caps: Pick<AiCapabilities, "fal" | "dashscope" | "nanoBanana" | "wan" | "ffmpeg">,
): ProviderFeatureCatalog {
  return {
    autoOnUpload: lectureAutoFeatureIds(),
    fallbackOnUpload: fallbackOnUploadFeatureIds(),
    features: PROVIDER_FEATURES.map((feature) => ({
      ...feature,
      ready: featureReady(feature, caps),
    })),
  };
}
