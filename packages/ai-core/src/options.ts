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
}

const ALLOWED = new Set(["seekSeconds", "prompt", "region", "style", "maxScenes", "confirmOwned"]);

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
  return out;
}

export function assertOwnedAbcReady(toolId: string, options: AiEditOptions): void {
  if (toolId !== "owned_abc") return;
  if (options.confirmOwned !== true) {
    throw new Error("Gói A+B+C cần bạn xác nhận video là của bạn (confirmOwned).");
  }
}
