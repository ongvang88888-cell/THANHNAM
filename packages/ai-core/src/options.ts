import {
  isCharacterLook,
  isInsertMode,
  type CharacterLook,
  type InsertMode,
} from "./character";
import { isReusablePresenterId } from "./character-identity";
import { isLectureExpertRecipeId } from "./expert-recipe";
import { isTargetLanguageId, type TargetLanguageId } from "./languages";
import { parsePublicHttpsUrl } from "./remote-media";

export const FACE_REGIONS = ["speaker", "full", "pip_br", "pip_bl", "pip_tr", "pip_tl"] as const;
export const VISUAL_STYLES = ["trend", "anime", "flat", "watercolor"] as const;
export const TOON_STRENGTHS = ["low", "medium", "high"] as const;

export type FaceRegion = (typeof FACE_REGIONS)[number];
export type VisualStyle = (typeof VISUAL_STYLES)[number];
export type ToonStrength = (typeof TOON_STRENGTHS)[number];

export interface AiEditOptions {
  seekSeconds?: number;
  prompt?: string;
  script?: string;
  targetLanguage?: TargetLanguageId;
  startMs?: number;
  endMs?: number;
  region?: FaceRegion;
  style?: VisualStyle;
  toonStrength?: ToonStrength;
  maxScenes?: number;
  confirmOwned?: boolean;
  confirmLikeness?: boolean;
  confirmFaceEdit?: boolean;
  confirmVoiceClone?: boolean;
  autoApply?: boolean;
  lessonId?: string;
  courseId?: string;
  recipeId?: string;
  characterImageUrl?: string;
  insertMode?: InsertMode;
  characterLook?: CharacterLook;
  heygenAvatarId?: string;
  heygenTalkingPhotoId?: string;
}

const ALLOWED = new Set([
  "seekSeconds",
  "prompt",
  "script",
  "targetLanguage",
  "startMs",
  "endMs",
  "region",
  "style",
  "toonStrength",
  "maxScenes",
  "confirmOwned",
  "confirmLikeness",
  "confirmFaceEdit",
  "confirmVoiceClone",
  "autoApply",
  "lessonId",
  "courseId",
  "recipeId",
  "characterImageUrl",
  "insertMode",
  "characterLook",
  "heygenAvatarId",
  "heygenTalkingPhotoId",
]);

const MAX_CLOCK_MS = 36_000_000;

const SCOPED_ID = /^[a-zA-Z0-9_-]{8,80}$/;

export function isPlaceholderLessonTitle(title: string): boolean {
  const trimmed = title.trim();
  if (!trimmed) return true;
  return /^(bài(\s*học)?(\s*mới)?(\s*\d+)?|lesson(\s+\d+)?|new lesson)$/i.test(trimmed);
}

function parseScopedId(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new Error(`${field} phải là chuỗi`);
  }
  const trimmed = value.trim();
  if (!SCOPED_ID.test(trimmed)) {
    throw new Error(`${field} không hợp lệ`);
  }
  return trimmed;
}

export function isFaceRegion(value: string): value is FaceRegion {
  return (FACE_REGIONS as readonly string[]).includes(value);
}

export function isVisualStyle(value: string): value is VisualStyle {
  return (VISUAL_STYLES as readonly string[]).includes(value);
}

export function isToonStrength(value: string): value is ToonStrength {
  return (TOON_STRENGTHS as readonly string[]).includes(value);
}

export function parseAiEditOptions(input: unknown): AiEditOptions {
  if (input == null) return {};
  if (typeof input !== "object" || Array.isArray(input)) {
    throw new Error("options phải là object");
  }
  const rec = input as Record<string, unknown>;
  for (const key of Object.keys(rec)) {
    if (!ALLOWED.has(key)) {
      throw new Error(`Tùy chọn không hợp lệ: ${key}`);
    }
  }
  const out: AiEditOptions = {};
  if (rec.seekSeconds !== undefined) {
    if (typeof rec.seekSeconds !== "number" || !Number.isFinite(rec.seekSeconds) || rec.seekSeconds < 0 || rec.seekSeconds > 36_000) {
      throw new Error("seekSeconds phải từ 0 đến 36000");
    }
    out.seekSeconds = rec.seekSeconds;
  }
  if (rec.prompt !== undefined) {
    if (typeof rec.prompt !== "string" || rec.prompt.length > 500) {
      throw new Error("prompt tối đa 500 ký tự");
    }
    const trimmed = rec.prompt.trim();
    if (trimmed) out.prompt = trimmed;
  }
  if (rec.script !== undefined) {
    if (typeof rec.script !== "string" || rec.script.length > 4000) {
      throw new Error("script tối đa 4000 ký tự");
    }
    const trimmed = rec.script.trim();
    if (trimmed) out.script = trimmed;
  }
  if (rec.targetLanguage !== undefined) {
    if (typeof rec.targetLanguage !== "string" || !isTargetLanguageId(rec.targetLanguage)) {
      throw new Error("targetLanguage không hỗ trợ");
    }
    out.targetLanguage = rec.targetLanguage;
  }
  if (rec.startMs !== undefined) {
    if (typeof rec.startMs !== "number" || !Number.isFinite(rec.startMs) || rec.startMs < 0 || rec.startMs > MAX_CLOCK_MS) {
      throw new Error("startMs phải từ 0 đến 36000000");
    }
    out.startMs = Math.round(rec.startMs);
  }
  if (rec.endMs !== undefined) {
    if (typeof rec.endMs !== "number" || !Number.isFinite(rec.endMs) || rec.endMs < 0 || rec.endMs > MAX_CLOCK_MS) {
      throw new Error("endMs phải từ 0 đến 36000000");
    }
    out.endMs = Math.round(rec.endMs);
  }
  if (rec.region !== undefined) {
    if (typeof rec.region !== "string" || !isFaceRegion(rec.region)) {
      throw new Error("region phải là speaker, full hoặc pip_br / pip_bl / pip_tr / pip_tl");
    }
    out.region = rec.region;
  }
  if (rec.style !== undefined) {
    if (typeof rec.style !== "string" || !isVisualStyle(rec.style)) {
      throw new Error("style phải là trend, anime, flat hoặc watercolor");
    }
    out.style = rec.style;
  }
  if (rec.toonStrength !== undefined) {
    if (typeof rec.toonStrength !== "string" || !isToonStrength(rec.toonStrength)) {
      throw new Error("toonStrength phải là low, medium hoặc high");
    }
    out.toonStrength = rec.toonStrength;
  }
  if (rec.maxScenes !== undefined) {
    if (typeof rec.maxScenes !== "number" || !Number.isInteger(rec.maxScenes) || rec.maxScenes < 3 || rec.maxScenes > 12) {
      throw new Error("maxScenes phải từ 3 đến 12");
    }
    out.maxScenes = rec.maxScenes;
  }
  if (rec.confirmOwned !== undefined) {
    if (typeof rec.confirmOwned !== "boolean") {
      throw new Error("confirmOwned phải là true hoặc false");
    }
    out.confirmOwned = rec.confirmOwned;
  }
  if (rec.confirmLikeness !== undefined) {
    if (typeof rec.confirmLikeness !== "boolean") {
      throw new Error("confirmLikeness phải là true hoặc false");
    }
    out.confirmLikeness = rec.confirmLikeness;
  }
  if (rec.confirmFaceEdit !== undefined) {
    if (typeof rec.confirmFaceEdit !== "boolean") {
      throw new Error("confirmFaceEdit phải là true hoặc false");
    }
    out.confirmFaceEdit = rec.confirmFaceEdit;
  }
  if (rec.confirmVoiceClone !== undefined) {
    if (typeof rec.confirmVoiceClone !== "boolean") {
      throw new Error("confirmVoiceClone phải là true hoặc false");
    }
    out.confirmVoiceClone = rec.confirmVoiceClone;
  }
  if (rec.autoApply !== undefined) {
    if (typeof rec.autoApply !== "boolean") {
      throw new Error("autoApply phải là true hoặc false");
    }
    out.autoApply = rec.autoApply;
  }
  if (rec.lessonId !== undefined) {
    out.lessonId = parseScopedId(rec.lessonId, "lessonId");
  }
  if (rec.courseId !== undefined) {
    out.courseId = parseScopedId(rec.courseId, "courseId");
  }
  if (rec.recipeId !== undefined) {
    if (typeof rec.recipeId !== "string" || !isLectureExpertRecipeId(rec.recipeId)) {
      throw new Error("recipeId phải là lecture_expert_v1");
    }
    out.recipeId = rec.recipeId;
  }
  if (rec.characterImageUrl !== undefined) {
    if (typeof rec.characterImageUrl !== "string" || rec.characterImageUrl.length > 500) {
      throw new Error("characterImageUrl tối đa 500 ký tự");
    }
    const trimmed = rec.characterImageUrl.trim();
    if (trimmed) {
      parsePublicHttpsUrl(trimmed, "characterImageUrl");
      out.characterImageUrl = trimmed;
    }
  }
  if (rec.insertMode !== undefined) {
    if (typeof rec.insertMode !== "string" || !isInsertMode(rec.insertMode)) {
      throw new Error("insertMode phải là replace, overlay, intro hoặc standalone");
    }
    out.insertMode = rec.insertMode;
  }
  if (rec.characterLook !== undefined) {
    if (typeof rec.characterLook !== "string" || !isCharacterLook(rec.characterLook)) {
      throw new Error("characterLook phải là teacher, cartoon_kid hoặc custom");
    }
    out.characterLook = rec.characterLook;
  }
  if (rec.heygenAvatarId !== undefined) {
    if (typeof rec.heygenAvatarId !== "string" || !isReusablePresenterId(rec.heygenAvatarId)) {
      throw new Error("heygenAvatarId không hợp lệ");
    }
    out.heygenAvatarId = rec.heygenAvatarId.trim();
  }
  if (rec.heygenTalkingPhotoId !== undefined) {
    if (typeof rec.heygenTalkingPhotoId !== "string" || !isReusablePresenterId(rec.heygenTalkingPhotoId)) {
      throw new Error("heygenTalkingPhotoId không hợp lệ");
    }
    out.heygenTalkingPhotoId = rec.heygenTalkingPhotoId.trim();
  }
  return out;
}

export function assertOwnedAbcReady(toolId: string, options: AiEditOptions): void {
  if (toolId !== "owned_abc") return;
  if (options.confirmOwned !== true) {
    throw new Error("Gói A+C cần bạn xác nhận video là của bạn (confirmOwned).");
  }
}

export function assertStudioConsent(toolId: string, options: AiEditOptions): void {
  assertOwnedAbcReady(toolId, options);
  if (toolId === "avatar_presenter" || toolId === "hailuo_character" || toolId === "veo_intro") {
    if (options.confirmOwned !== true) {
      throw new Error("Nhân vật ảo cần xác nhận bạn sở hữu kịch bản/ảnh (confirmOwned).");
    }
    if (options.confirmLikeness !== true) {
      throw new Error("Nhân vật ảo cần xác nhận đây là người ảo hoặc ảnh bạn có quyền (confirmLikeness).");
    }
    return;
  }
  if (toolId === "video_translate") {
    if (options.confirmOwned !== true) {
      throw new Error("Dịch video cần xác nhận video là của bạn (confirmOwned).");
    }
    if (!options.targetLanguage) {
      throw new Error("Chọn ngôn ngữ đích (targetLanguage).");
    }
    return;
  }
  if (toolId === "toon_talking_head") {
    if (options.confirmOwned !== true) {
      throw new Error("Tô hoạt hình cần xác nhận video là của bạn (confirmOwned).");
    }
    if (options.confirmFaceEdit !== true) {
      throw new Error("Tô hoạt hình cần xác nhận được phép sửa mặt người (confirmFaceEdit).");
    }
    return;
  }
  if (toolId === "eye_contact") {
    if (options.confirmOwned !== true) {
      throw new Error("Canh mắt cần xác nhận video là của bạn (confirmOwned).");
    }
    if (options.confirmFaceEdit !== true) {
      throw new Error("Canh mắt cần xác nhận được phép sửa khuôn mặt (confirmFaceEdit).");
    }
    return;
  }
  if (toolId === "overdub") {
    if (options.confirmOwned !== true) {
      throw new Error("Overdub cần xác nhận video và giọng là của bạn (confirmOwned).");
    }
    if (options.confirmVoiceClone !== true) {
      throw new Error("Overdub cần xác nhận chỉ clone giọng bạn sở hữu (confirmVoiceClone).");
    }
    if (!options.script) {
      throw new Error("Overdub cần câu thay thế (script).");
    }
  }
}
