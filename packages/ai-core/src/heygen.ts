import { isReusablePresenterId } from "./character-identity";
import { getTargetLanguage } from "./languages";
import { isAllowedHeygenMediaUrl } from "./remote-media";

export { isAllowedHeygenMediaUrl } from "./remote-media";

export const HEYGEN_GENERATE_URL = "https://api.heygen.com/v2/video/generate";
export const HEYGEN_STATUS_URL = "https://api.heygen.com/v1/video_status.get";
export const HEYGEN_TRANSLATE_URL = "https://api.heygen.com/v2/video_translate";
export const HEYGEN_UPLOAD_PHOTO_URL = "https://upload.heygen.com/v1/talking_photo";
export const HEYGEN_CREATE_AVATAR_URL = "https://api.heygen.com/v3/avatars";

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

export type HeygenCharacter =
  | { type: "avatar"; avatar_id: string; avatar_style: "normal" }
  | { type: "talking_photo"; talking_photo_id: string };

export function buildHeygenAvatarBody(input: {
  script: string;
  title: string;
  talkingPhotoId?: string;
  avatarId?: string;
}): {
  title: string;
  video_inputs: Array<{
    character: HeygenCharacter;
    voice: { type: "text"; input_text: string; voice_id: string };
  }>;
  dimension: { width: number; height: number };
} {
  const script = input.script.trim().slice(0, 4000);
  if (!script) throw new Error("Kịch bản avatar trống");
  const talkingPhotoId = input.talkingPhotoId?.trim();
  const avatarId = input.avatarId?.trim() || process.env.HEYGEN_AVATAR_ID?.trim() || DEFAULT_AVATAR_ID;
  if (talkingPhotoId && !isReusablePresenterId(talkingPhotoId)) {
    throw new Error("heygenTalkingPhotoId không hợp lệ");
  }
  if (input.avatarId && !isReusablePresenterId(input.avatarId.trim())) {
    throw new Error("heygenAvatarId không hợp lệ");
  }
  const character: HeygenCharacter = talkingPhotoId
    ? { type: "talking_photo", talking_photo_id: talkingPhotoId }
    : {
        type: "avatar",
        avatar_id: avatarId,
        avatar_style: "normal",
      };
  return {
    title: input.title.trim().slice(0, 80) || "Bai hoc",
    video_inputs: [
      {
        character,
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

export type HeygenCreateAvatarBody =
  | {
      type: "photo";
      name: string;
      file: { type: "url"; url: string };
      avatar_group_id?: string;
    }
  | {
      type: "prompt";
      name: string;
      prompt: string;
      avatar_id?: string;
      avatar_group_id?: string;
    };

export function buildHeygenCreateAvatarBody(input: {
  type: "photo" | "prompt";
  name: string;
  stillUrl?: string;
  prompt?: string;
  avatarId?: string;
  avatarGroupId?: string;
}): HeygenCreateAvatarBody {
  const name = input.name.trim().slice(0, 80) || "Presenter";
  const groupId = input.avatarGroupId?.trim();
  if (groupId && !isReusablePresenterId(groupId)) {
    throw new Error("heygenGroupId không hợp lệ");
  }
  if (input.type === "photo") {
    const url = input.stillUrl?.trim();
    if (!url?.startsWith("https://")) {
      throw new Error("HeyGen photo avatar cần ảnh https");
    }
    return {
      type: "photo",
      name,
      file: { type: "url", url },
      ...(groupId ? { avatar_group_id: groupId } : {}),
    };
  }
  const prompt = (input.prompt || "").replace(/\s+/g, " ").trim().slice(0, 1000);
  if (!prompt) throw new Error("HeyGen prompt avatar cần mô tả");
  const avatarId = input.avatarId?.trim();
  if (avatarId && !isReusablePresenterId(avatarId)) {
    throw new Error("heygenAvatarId không hợp lệ");
  }
  return {
    type: "prompt",
    name,
    prompt,
    ...(avatarId ? { avatar_id: avatarId } : {}),
    ...(groupId ? { avatar_group_id: groupId } : {}),
  };
}

export type HeygenAvatarCreate = {
  avatarId: string | null;
  groupId: string | null;
  voiceId: string | null;
  status: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function firstReusableId(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && isReusablePresenterId(value)) return value.trim();
  }
  return null;
}

export function parseHeygenAvatarCreate(payload: unknown): HeygenAvatarCreate {
  const rec = asRecord(payload);
  if (!rec) throw new Error("HeyGen avatar rỗng");
  const data = asRecord(rec.data) ?? rec;
  const item = asRecord(data.avatar_item) ?? asRecord(data.look) ?? data;
  const group = asRecord(data.avatar_group) ?? asRecord(item.avatar_group);
  const avatarId = firstReusableId(
    item.id,
    item.look_id,
    item.avatar_id,
    data.look_id,
    data.avatar_id,
    rec.avatar_id,
  );
  if (!avatarId) throw new Error("HeyGen không trả avatar_item.id");
  return {
    avatarId,
    groupId: firstReusableId(group?.id, data.avatar_group_id, data.group_id, item.group_id, rec.avatar_group_id),
    voiceId: firstReusableId(item.default_voice_id, data.default_voice_id, group?.default_voice_id),
    status: typeof item.status === "string" ? item.status : typeof data.status === "string" ? data.status : null,
  };
}

export function parseHeygenTalkingPhotoId(payload: unknown): string {
  if (!payload || typeof payload !== "object") throw new Error("HeyGen talking photo rỗng");
  const rec = payload as Record<string, unknown>;
  const data = rec.data && typeof rec.data === "object" ? (rec.data as Record<string, unknown>) : rec;
  const id = data.talking_photo_id ?? data.talkingPhotoId ?? rec.talking_photo_id;
  if (typeof id === "string" && id.trim()) return id.trim();
  throw new Error("HeyGen không trả talking_photo_id");
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
