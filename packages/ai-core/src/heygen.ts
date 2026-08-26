import { getTargetLanguage } from "./languages";

export const HEYGEN_GENERATE_URL = "https://api.heygen.com/v2/video/generate";
export const HEYGEN_STATUS_URL = "https://api.heygen.com/v1/video_status.get";
export const HEYGEN_TRANSLATE_URL = "https://api.heygen.com/v2/video_translate";

const DEFAULT_AVATAR_ID = "Angela-inblackskirt-20220820";
const DEFAULT_VOICE_ID = "1bd001e7e50f421d891986aad5158bc8";

export function heygenApiKey(): string | null {
  const key = process.env.HEYGEN_API_KEY?.trim();
  return key || null;
}

export function heygenHeaders(apiKey: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Api-Key": apiKey,
  };
}

export function buildHeygenAvatarBody(input: { script: string; title: string }): {
  title: string;
  video_inputs: Array<{
    character: { type: "avatar"; avatar_id: string; avatar_style: "normal" };
    voice: { type: "text"; input_text: string; voice_id: string };
  }>;
  dimension: { width: number; height: number };
} {
  const script = input.script.trim().slice(0, 4000);
  if (!script) throw new Error("Kịch bản avatar trống");
  return {
    title: input.title.trim().slice(0, 80) || "Bai hoc",
    video_inputs: [
      {
        character: {
          type: "avatar",
          avatar_id: process.env.HEYGEN_AVATAR_ID?.trim() || DEFAULT_AVATAR_ID,
          avatar_style: "normal",
        },
        voice: {
          type: "text",
          input_text: script,
          voice_id: process.env.HEYGEN_VOICE_ID?.trim() || DEFAULT_VOICE_ID,
        },
      },
    ],
    dimension: { width: 1280, height: 720 },
  };
}

export function buildHeygenTranslateBody(input: { videoUrl: string; title: string; targetLanguage: string }): {
  video_url: string;
  output_language: string;
  title: string;
} {
  const lang = getTargetLanguage(input.targetLanguage);
  if (!lang) throw new Error("Ngôn ngữ dịch không hỗ trợ");
  const videoUrl = input.videoUrl.trim();
  if (!videoUrl.startsWith("https://")) {
    throw new Error("HeyGen cần URL https công khai của video");
  }
  return {
    video_url: videoUrl,
    output_language: lang.heygenName,
    title: input.title.trim().slice(0, 80) || "Translated lesson",
  };
}

export function isAllowedHeygenMediaUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    if (host === "heygen.com" || host.endsWith(".heygen.com")) return true;
    if (host === "heygen.ai" || host.endsWith(".heygen.ai")) return true;
    return false;
  } catch {
    return false;
  }
}

export function parseHeygenVideoId(payload: unknown): string {
  if (!payload || typeof payload !== "object") throw new Error("HeyGen trả về rỗng");
  const rec = payload as Record<string, unknown>;
  const data = rec.data && typeof rec.data === "object" ? (rec.data as Record<string, unknown>) : rec;
  const id = data.video_id ?? data.videoId ?? rec.video_id;
  if (typeof id === "string" && id.trim()) return id.trim();
  throw new Error("HeyGen không trả video_id");
}

export function parseHeygenStatus(payload: unknown): {
  status: "pending" | "processing" | "completed" | "failed";
  videoUrl: string | null;
  error: string | null;
} {
  if (!payload || typeof payload !== "object") {
    return { status: "failed", videoUrl: null, error: "HeyGen status rỗng" };
  }
  const rec = payload as Record<string, unknown>;
  const data = rec.data && typeof rec.data === "object" ? (rec.data as Record<string, unknown>) : rec;
  const raw = String(data.status ?? rec.status ?? "pending").toLowerCase();
  if (raw === "failed" || raw === "error") {
    const error = typeof data.error === "string" ? data.error : "HeyGen xử lý thất bại";
    return { status: "failed", videoUrl: null, error };
  }
  const rawUrl =
    (typeof data.video_url === "string" && data.video_url) ||
    (typeof data.url === "string" && data.url) ||
    null;
  const videoUrl = rawUrl && isAllowedHeygenMediaUrl(rawUrl) ? rawUrl : null;
  if (rawUrl && !videoUrl) {
    return { status: "failed", videoUrl: null, error: "HeyGen trả URL không hợp lệ" };
  }
  if (raw === "completed" || raw === "success" || videoUrl) {
    return { status: "completed", videoUrl, error: null };
  }
  if (raw === "processing" || raw === "running") {
    return { status: "processing", videoUrl: null, error: null };
  }
  return { status: "pending", videoUrl: null, error: null };
}
