import { isAllowedMinimaxMediaUrl } from "./remote-media";

export const MINIMAX_DEFAULT_BASE = "https://api.minimax.io";
export const MINIMAX_DEFAULT_MODEL = "MiniMax-H3";

export function minimaxApiKey(): string | null {
  const key = process.env.MINIMAX_API_KEY?.trim();
  return key || null;
}

export function minimaxApiBase(): string {
  const raw = process.env.MINIMAX_API_BASE?.trim() || MINIMAX_DEFAULT_BASE;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:") return MINIMAX_DEFAULT_BASE;
    const host = parsed.hostname.toLowerCase();
    if (host === "api.minimax.io" || host === "api.minimax.chat") return `${parsed.protocol}//${host}`;
    return MINIMAX_DEFAULT_BASE;
  } catch {
    return MINIMAX_DEFAULT_BASE;
  }
}

export function minimaxModel(): string {
  return process.env.MINIMAX_MODEL?.trim() || MINIMAX_DEFAULT_MODEL;
}

export function minimaxHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

export function minimaxCreateUrl(): string {
  return `${minimaxApiBase()}/v2/video_generation`;
}

export function minimaxQueryUrl(taskId: string): string {
  return `${minimaxApiBase()}/v2/query/video_generation/${encodeURIComponent(taskId)}`;
}

export function clampMinimaxDuration(seconds?: number): number {
  if (!Number.isFinite(seconds) || seconds == null) return 6;
  return Math.max(4, Math.min(15, Math.round(seconds)));
}

export function buildMinimaxVideoBody(input: {
  prompt: string;
  imageUrl?: string;
  durationSec?: number;
  resolution?: "768P" | "2K";
}): {
  model: string;
  content: Array<Record<string, unknown>>;
  duration: number;
  resolution: "768P" | "2K";
  ratio?: "16:9";
} {
  const prompt = input.prompt.replace(/\s+/g, " ").trim().slice(0, 7000);
  if (!prompt) throw new Error("Prompt Hailuo/MiniMax trống");
  const content: Array<Record<string, unknown>> = [{ type: "text", text: prompt }];
  if (input.imageUrl) {
    if (!input.imageUrl.startsWith("https://")) {
      throw new Error("MiniMax cần ảnh https công khai");
    }
    content.push({
      type: "image_url",
      image_url: { url: input.imageUrl },
      role: "first_frame",
    });
  }
  const body: {
    model: string;
    content: Array<Record<string, unknown>>;
    duration: number;
    resolution: "768P" | "2K";
    ratio?: "16:9";
  } = {
    model: minimaxModel(),
    content,
    duration: clampMinimaxDuration(input.durationSec),
    resolution: input.resolution ?? "768P",
  };
  if (!input.imageUrl) body.ratio = "16:9";
  return body;
}

export function parseMinimaxTaskId(payload: unknown): string {
  if (!payload || typeof payload !== "object") throw new Error("MiniMax trả về rỗng");
  const rec = payload as Record<string, unknown>;
  const id = rec.task_id ?? rec.taskId;
  if (typeof id === "string" && id.trim()) return id.trim();
  const task = rec.task && typeof rec.task === "object" ? (rec.task as Record<string, unknown>) : null;
  const nested = task?.id ?? task?.task_id;
  if (typeof nested === "string" && nested.trim()) return nested.trim();
  throw new Error("MiniMax không trả task_id");
}

export function parseMinimaxStatus(payload: unknown): {
  status: "pending" | "processing" | "completed" | "failed";
  videoUrl: string | null;
  error: string | null;
} {
  if (!payload || typeof payload !== "object") {
    return { status: "failed", videoUrl: null, error: "MiniMax status rỗng" };
  }
  const rec = payload as Record<string, unknown>;
  const task = rec.task && typeof rec.task === "object" ? (rec.task as Record<string, unknown>) : rec;
  const raw = String(task.status ?? rec.status ?? "pending").toLowerCase();
  if (raw === "failed" || raw === "cancelled" || raw === "canceled" || raw === "error") {
    const errObj = task.error && typeof task.error === "object" ? (task.error as Record<string, unknown>) : null;
    const error =
      (typeof task.error === "string" && task.error) ||
      (typeof errObj?.message === "string" && errObj.message) ||
      "MiniMax xử lý thất bại";
    return { status: "failed", videoUrl: null, error };
  }
  const content = task.content && typeof task.content === "object" ? (task.content as Record<string, unknown>) : null;
  const rawUrl =
    (typeof content?.url === "string" && content.url) ||
    (typeof task.video_url === "string" && task.video_url) ||
    (typeof rec.file_id === "string" ? null : null);
  const videoUrl = rawUrl && isAllowedMinimaxMediaUrl(rawUrl) ? rawUrl : null;
  if (rawUrl && !videoUrl) {
    return { status: "failed", videoUrl: null, error: "MiniMax trả URL không hợp lệ" };
  }
  if (raw === "succeeded" || raw === "success" || raw === "completed" || videoUrl) {
    return { status: "completed", videoUrl, error: null };
  }
  if (raw === "processing" || raw === "running" || raw === "preparing") {
    return { status: "processing", videoUrl: null, error: null };
  }
  return { status: "pending", videoUrl: null, error: null };
}
