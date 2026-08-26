import { isAllowedVeoMediaUrl, parsePublicHttpsUrl } from "./remote-media";

export const VEO_DEFAULT_MODEL = "veo-3.1-generate-preview";

export function veoApiKey(): string | null {
  const key = process.env.VEO_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim();
  return key || null;
}

export function veoModel(): string {
  const raw = process.env.VEO_MODEL?.trim() || VEO_DEFAULT_MODEL;
  return /^[a-zA-Z0-9._-]{4,80}$/.test(raw) ? raw : VEO_DEFAULT_MODEL;
}

export function veoGenerateUrl(apiKey: string): string {
  const model = encodeURIComponent(veoModel());
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:predictLongRunning?key=${encodeURIComponent(apiKey)}`;
}

export function veoOperationUrl(name: string, apiKey: string): string {
  const trimmed = name.replace(/^\/+/, "");
  if (!trimmed.startsWith("operations/")) {
    throw new Error("Veo operation không hợp lệ");
  }
  return `https://generativelanguage.googleapis.com/v1beta/${trimmed}?key=${encodeURIComponent(apiKey)}`;
}

export function buildVeoGenerateBody(input: {
  prompt: string;
  imageBase64?: string;
  imageMime?: string;
}): {
  instances: Array<Record<string, unknown>>;
  parameters: { aspectRatio: "16:9"; durationSeconds: number; personGeneration: "allow_adult" };
} {
  const prompt = input.prompt.replace(/\s+/g, " ").trim().slice(0, 2000);
  if (!prompt) throw new Error("Prompt Veo trống");
  const instance: Record<string, unknown> = { prompt };
  if (input.imageBase64?.trim()) {
    instance.image = {
      bytesBase64Encoded: input.imageBase64.trim(),
      mimeType: input.imageMime?.trim() || "image/png",
    };
  }
  return {
    instances: [instance],
    parameters: {
      aspectRatio: "16:9",
      durationSeconds: 8,
      personGeneration: "allow_adult",
    },
  };
}

export function parseVeoOperationName(payload: unknown): string {
  if (!payload || typeof payload !== "object") throw new Error("Veo trả về rỗng");
  const rec = payload as Record<string, unknown>;
  const name = rec.name;
  if (typeof name === "string" && name.includes("operations/")) return name.trim();
  throw new Error("Veo không trả operation name");
}

function firstVideoUri(node: unknown): string | null {
  if (!node || typeof node !== "object") return null;
  const rec = node as Record<string, unknown>;
  const direct = rec.uri ?? rec.url;
  if (typeof direct === "string" && direct.startsWith("https://")) return direct;
  const video = rec.video && typeof rec.video === "object" ? (rec.video as Record<string, unknown>) : null;
  if (video) {
    const nested = firstVideoUri(video);
    if (nested) return nested;
  }
  for (const key of ["generatedSamples", "generatedVideos", "videos", "samples"]) {
    const list = rec[key];
    if (Array.isArray(list)) {
      for (const item of list) {
        const found = firstVideoUri(item);
        if (found) return found;
      }
    }
  }
  return null;
}

export function parseVeoStatus(payload: unknown): {
  status: "pending" | "processing" | "completed" | "failed";
  videoUrl: string | null;
  error: string | null;
} {
  if (!payload || typeof payload !== "object") {
    return { status: "failed", videoUrl: null, error: "Veo status rỗng" };
  }
  const rec = payload as Record<string, unknown>;
  if (rec.error && typeof rec.error === "object") {
    const err = rec.error as Record<string, unknown>;
    const message = typeof err.message === "string" ? err.message : "Veo xử lý thất bại";
    return { status: "failed", videoUrl: null, error: message };
  }
  const response = rec.response && typeof rec.response === "object" ? (rec.response as Record<string, unknown>) : rec;
  const rawUrl =
    firstVideoUri(response.generateVideoResponse) ||
    firstVideoUri(response.generateVideosResponse) ||
    firstVideoUri(response);
  let videoUrl: string | null = null;
  if (rawUrl) {
    try {
      parsePublicHttpsUrl(rawUrl, "Veo video");
      videoUrl = isAllowedVeoMediaUrl(rawUrl) ? rawUrl : null;
    } catch {
      videoUrl = null;
    }
    if (!videoUrl) {
      return { status: "failed", videoUrl: null, error: "Veo trả URL không hợp lệ" };
    }
  }
  if (rec.done === true || videoUrl) {
    return { status: "completed", videoUrl, error: null };
  }
  return { status: "processing", videoUrl: null, error: null };
}
