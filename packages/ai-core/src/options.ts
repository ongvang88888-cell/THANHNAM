import { isLectureExpertRecipeId } from "./expert-recipe";

export const FACE_REGIONS = ["full", "pip_br", "pip_bl", "pip_tr", "pip_tl"] as const;
export const VISUAL_STYLES = ["anime", "flat", "watercolor"] as const;

export type FaceRegion = (typeof FACE_REGIONS)[number];
export type VisualStyle = (typeof VISUAL_STYLES)[number];

export interface AiEditOptions {
  seekSeconds?: number;
  prompt?: string;
  region?: FaceRegion;
  style?: VisualStyle;
  maxScenes?: number;
  confirmOwned?: boolean;
  autoApply?: boolean;
  lessonId?: string;
  courseId?: string;
  recipeId?: string;
}

const ALLOWED = new Set([
  "seekSeconds",
  "prompt",
  "region",
  "style",
  "maxScenes",
  "confirmOwned",
  "autoApply",
  "lessonId",
  "courseId",
  "recipeId",
]);

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
  if (rec.region !== undefined) {
    if (typeof rec.region !== "string" || !isFaceRegion(rec.region)) {
      throw new Error("region phải là full hoặc pip_br / pip_bl / pip_tr / pip_tl");
    }
    out.region = rec.region;
  }
  if (rec.style !== undefined) {
    if (typeof rec.style !== "string" || !isVisualStyle(rec.style)) {
      throw new Error("style phải là anime, flat hoặc watercolor");
    }
    out.style = rec.style;
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
  return out;
}

export function assertOwnedAbcReady(toolId: string, options: AiEditOptions): void {
  if (toolId !== "owned_abc") return;
  if (options.confirmOwned !== true) {
    throw new Error("Gói A+C cần bạn xác nhận video là của bạn (confirmOwned).");
  }
}
