import { parsePublicHttpsUrl } from "./remote-media";

export const WAN_FAL_MODEL = "fal-ai/wan/v2.2-14b/animate/replace";
export const WAN_DASHSCOPE_MODEL = "wan2.2-animate-mix";
export const WAN_CHUNK_SEC = 20;
export const WAN_MIN_SEC = 2;
export const WAN_MAX_SEC = 28;
export const WAN_MISSING_KEY =
  "Cần FAL_KEY (Fal Wan 2.2) hoặc DASHSCOPE_API_KEY (Alibaba Wan 2.2) trên máy chủ. Không thay người bằng thẻ chữ / Ken Burns.";

export type WanProvider = "fal" | "dashscope";

export type WanChunk = {
  startSec: number;
  durationSec: number;
};

export function falApiKey(): string | null {
  const key = process.env.FAL_KEY?.trim();
  return key || null;
}

export function dashscopeApiKey(): string | null {
  const key = process.env.DASHSCOPE_API_KEY?.trim();
  return key || null;
}

export function wanProviderFromEnv(): WanProvider | null {
  if (falApiKey()) return "fal";
  if (dashscopeApiKey()) return "dashscope";
  return null;
}

export function wanReadyFromEnv(): boolean {
  return wanProviderFromEnv() !== null;
}

export function falAuthHeader(apiKey: string): { Authorization: string } {
  return { Authorization: `Key ${apiKey}` };
}

export function falQueueUrl(model = WAN_FAL_MODEL): string {
  return `https://queue.fal.run/${model}`;
}

export function falStatusUrl(requestId: string, model = WAN_FAL_MODEL): string {
  return `https://queue.fal.run/${model}/requests/${encodeURIComponent(requestId)}/status`;
}

export function falResultUrl(requestId: string, model = WAN_FAL_MODEL): string {
  return `https://queue.fal.run/${model}/requests/${encodeURIComponent(requestId)}`;
}

export function dashscopeCreateUrl(): string {
  return "https://dashscope.aliyuncs.com/api/v1/services/aigc/image2video/video-synthesis";
}

export function dashscopeTaskUrl(taskId: string): string {
  return `https://dashscope.aliyuncs.com/api/v1/tasks/${encodeURIComponent(taskId)}`;
}

export function planWanChunks(durationSec: number): WanChunk[] {
  const total = Number.isFinite(durationSec) ? durationSec : 0;
  if (total < WAN_MIN_SEC) {
    throw new Error(`Video quá ngắn cho Wan 2.2 (cần ≥ ${WAN_MIN_SEC} giây).`);
  }
  const chunks: WanChunk[] = [];
  let start = 0;
  while (start < total - 0.05) {
    const remaining = total - start;
    let duration = Math.min(WAN_CHUNK_SEC, remaining);
    if (remaining > WAN_CHUNK_SEC && remaining - WAN_CHUNK_SEC < WAN_MIN_SEC) {
      duration = remaining;
    }
    duration = Math.min(WAN_MAX_SEC, Math.max(WAN_MIN_SEC, duration));
    if (start + duration > total) {
      duration = Math.max(WAN_MIN_SEC, total - start);
    }
    chunks.push({ startSec: Number(start.toFixed(3)), durationSec: Number(duration.toFixed(3)) });
    start += duration;
  }
  const last = chunks[chunks.length - 1];
  if (last && last.durationSec < WAN_MIN_SEC && chunks.length > 1) {
    const prev = chunks[chunks.length - 2]!;
    prev.durationSec = Number((prev.durationSec + last.durationSec).toFixed(3));
    if (prev.durationSec > WAN_MAX_SEC) {
      last.startSec = Number((prev.startSec + WAN_CHUNK_SEC).toFixed(3));
      last.durationSec = Number((prev.durationSec - WAN_CHUNK_SEC).toFixed(3));
      prev.durationSec = WAN_CHUNK_SEC;
    } else {
      chunks.pop();
    }
  }
  return chunks;
}

export function parseFalQueueSubmit(raw: unknown): { requestId: string } {
  if (!raw || typeof raw !== "object") throw new Error("Fal không trả request_id.");
  const rec = raw as { request_id?: unknown; requestId?: unknown };
  const id = typeof rec.request_id === "string" ? rec.request_id : typeof rec.requestId === "string" ? rec.requestId : "";
  if (!id.trim()) throw new Error("Fal không trả request_id.");
  return { requestId: id.trim() };
}

export function parseFalQueueStatus(raw: unknown): "queued" | "running" | "done" | "failed" {
  if (!raw || typeof raw !== "object") return "queued";
  const status = String((raw as { status?: unknown }).status ?? "").toUpperCase();
  if (status === "COMPLETED") return "done";
  if (status === "FAILED" || status === "ERROR" || status === "CANCELLED") return "failed";
  if (status === "IN_PROGRESS") return "running";
  return "queued";
}

function fileUrlFromUnknown(value: unknown): string | null {
  if (typeof value === "string" && value.startsWith("https://")) return value;
  if (value && typeof value === "object") {
    const rec = value as { url?: unknown };
    if (typeof rec.url === "string" && rec.url.startsWith("https://")) return rec.url;
  }
  return null;
}

export function parseFalReplaceResult(raw: unknown): string {
  if (!raw || typeof raw !== "object") throw new Error("Fal không trả video.");
  const rec = raw as { video?: unknown; output?: { video?: unknown }; data?: { video?: unknown } };
  const url =
    fileUrlFromUnknown(rec.video) ||
    fileUrlFromUnknown(rec.output?.video) ||
    fileUrlFromUnknown(rec.data?.video);
  if (!url) throw new Error("Fal không trả URL video Wan 2.2.");
  parsePublicHttpsUrl(url, "Wan Fal");
  return url;
}

export function parseFalUploadInitiate(raw: unknown): { uploadUrl: string; fileUrl: string } {
  if (!raw || typeof raw !== "object") throw new Error("Fal upload không trả URL.");
  const rec = raw as { upload_url?: unknown; file_url?: unknown; uploadUrl?: unknown; fileUrl?: unknown };
  const uploadUrl =
    typeof rec.upload_url === "string" ? rec.upload_url : typeof rec.uploadUrl === "string" ? rec.uploadUrl : "";
  const fileUrl = typeof rec.file_url === "string" ? rec.file_url : typeof rec.fileUrl === "string" ? rec.fileUrl : "";
  if (!uploadUrl.startsWith("https://") || !fileUrl.startsWith("https://")) {
    throw new Error("Fal upload không trả URL https.");
  }
  return { uploadUrl, fileUrl };
}

export function parseDashscopeTaskId(raw: unknown): string {
  if (!raw || typeof raw !== "object") throw new Error("DashScope không trả task_id.");
  const rec = raw as { output?: { task_id?: unknown }; request_id?: unknown };
  const id = typeof rec.output?.task_id === "string" ? rec.output.task_id : "";
  if (!id.trim()) throw new Error("DashScope không trả task_id.");
  return id.trim();
}

export function parseDashscopeTask(raw: unknown): { status: "queued" | "running" | "done" | "failed"; videoUrl?: string; error?: string } {
  if (!raw || typeof raw !== "object") return { status: "queued" };
  const rec = raw as {
    output?: {
      task_status?: unknown;
      video_url?: unknown;
      results?: Array<{ url?: unknown }>;
      message?: unknown;
    };
    code?: unknown;
    message?: unknown;
  };
  const status = String(rec.output?.task_status ?? "").toUpperCase();
  if (status === "FAILED" || status === "UNKNOWN" || rec.code) {
    const error = typeof rec.output?.message === "string" ? rec.output.message : typeof rec.message === "string" ? rec.message : "DashScope thất bại";
    return { status: "failed", error };
  }
  const videoUrl =
    typeof rec.output?.video_url === "string"
      ? rec.output.video_url
      : typeof rec.output?.results?.[0]?.url === "string"
        ? rec.output.results[0].url
        : undefined;
  if (status === "SUCCEEDED" && videoUrl?.startsWith("https://")) {
    return { status: "done", videoUrl };
  }
  if (status === "RUNNING") return { status: "running" };
  return { status: "queued" };
}

export function buildDashscopeReplaceBody(input: { imageUrl: string; videoUrl: string }): unknown {
  return {
    model: WAN_DASHSCOPE_MODEL,
    input: {
      image_url: input.imageUrl,
      video_url: input.videoUrl,
    },
    parameters: {
      mode: "wan-std",
    },
  };
}

export async function falUploadBytes(input: {
  bytes: Buffer;
  filename: string;
  contentType: string;
  fetchImpl?: typeof fetch;
}): Promise<string> {
  const apiKey = falApiKey();
  if (!apiKey) throw new Error(WAN_MISSING_KEY);
  const doFetch = input.fetchImpl ?? fetch;
  const initiate = await doFetch("https://rest.alpha.fal.ai/storage/upload/initiate", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...falAuthHeader(apiKey) },
    body: JSON.stringify({
      file_name: input.filename,
      content_type: input.contentType,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  const initiateJson: unknown = await initiate.json().catch(() => null);
  if (!initiate.ok) {
    throw new Error(`Fal upload initiate thất bại (${initiate.status})`);
  }
  const { uploadUrl, fileUrl } = parseFalUploadInitiate(initiateJson);
  const put = await doFetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": input.contentType },
    body: new Uint8Array(input.bytes),
    signal: AbortSignal.timeout(180_000),
  });
  if (!put.ok) throw new Error(`Fal upload thất bại (${put.status})`);
  return fileUrl;
}

export async function falReplaceCharacter(input: {
  videoUrl: string;
  imageUrl: string;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  timeoutMs?: number;
}): Promise<string> {
  const apiKey = falApiKey();
  if (!apiKey) throw new Error(WAN_MISSING_KEY);
  const doFetch = input.fetchImpl ?? fetch;
  const sleep = input.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  parsePublicHttpsUrl(input.videoUrl, "Video Wan");
  parsePublicHttpsUrl(input.imageUrl, "Ảnh nhân vật Wan");
  const submit = await doFetch(falQueueUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...falAuthHeader(apiKey) },
    body: JSON.stringify({
      video_url: input.videoUrl,
      image_url: input.imageUrl,
    }),
    signal: AbortSignal.timeout(60_000),
  });
  const submitted: unknown = await submit.json().catch(() => null);
  if (!submit.ok) {
    throw new Error(`Fal Wan 2.2 nhận việc thất bại (${submit.status})`);
  }
  const { requestId } = parseFalQueueSubmit(submitted);
  const deadline = Date.now() + (input.timeoutMs ?? 12 * 60 * 1000);
  while (Date.now() < deadline) {
    await sleep(4_000);
    const statusRes = await doFetch(falStatusUrl(requestId), {
      headers: falAuthHeader(apiKey),
      signal: AbortSignal.timeout(30_000),
    });
    const statusJson: unknown = await statusRes.json().catch(() => null);
    if (!statusRes.ok) throw new Error(`Fal status thất bại (${statusRes.status})`);
    const status = parseFalQueueStatus(statusJson);
    if (status === "failed") throw new Error("Fal Wan 2.2 xử lý thất bại.");
    if (status === "done") {
      const resultRes = await doFetch(falResultUrl(requestId), {
        headers: falAuthHeader(apiKey),
        signal: AbortSignal.timeout(30_000),
      });
      const resultJson: unknown = await resultRes.json().catch(() => null);
      if (!resultRes.ok) throw new Error(`Fal result thất bại (${resultRes.status})`);
      return parseFalReplaceResult(resultJson);
    }
  }
  throw new Error("Fal Wan 2.2 quá hạn (hơn 12 phút / đoạn).");
}

export async function dashscopeReplaceCharacter(input: {
  videoUrl: string;
  imageUrl: string;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  timeoutMs?: number;
}): Promise<string> {
  const apiKey = dashscopeApiKey();
  if (!apiKey) throw new Error(WAN_MISSING_KEY);
  const doFetch = input.fetchImpl ?? fetch;
  const sleep = input.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  parsePublicHttpsUrl(input.videoUrl, "Video Wan");
  parsePublicHttpsUrl(input.imageUrl, "Ảnh nhân vật Wan");
  const submit = await doFetch(dashscopeCreateUrl(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-DashScope-Async": "enable",
    },
    body: JSON.stringify(buildDashscopeReplaceBody({ imageUrl: input.imageUrl, videoUrl: input.videoUrl })),
    signal: AbortSignal.timeout(60_000),
  });
  const submitted: unknown = await submit.json().catch(() => null);
  if (!submit.ok) throw new Error(`DashScope Wan 2.2 nhận việc thất bại (${submit.status})`);
  const taskId = parseDashscopeTaskId(submitted);
  const deadline = Date.now() + (input.timeoutMs ?? 12 * 60 * 1000);
  while (Date.now() < deadline) {
    await sleep(5_000);
    const statusRes = await doFetch(dashscopeTaskUrl(taskId), {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(30_000),
    });
    const statusJson: unknown = await statusRes.json().catch(() => null);
    if (!statusRes.ok) throw new Error(`DashScope status thất bại (${statusRes.status})`);
    const parsed = parseDashscopeTask(statusJson);
    if (parsed.status === "failed") throw new Error(parsed.error || "DashScope Wan 2.2 thất bại.");
    if (parsed.status === "done" && parsed.videoUrl) return parsed.videoUrl;
  }
  throw new Error("DashScope Wan 2.2 quá hạn (hơn 12 phút / đoạn).");
}

export async function wanReplaceCharacter(input: {
  videoUrl: string;
  imageUrl: string;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  timeoutMs?: number;
}): Promise<{ videoUrl: string; provider: WanProvider }> {
  const provider = wanProviderFromEnv();
  if (!provider) throw new Error(WAN_MISSING_KEY);
  if (provider === "fal") {
    const videoUrl = await falReplaceCharacter(input);
    return { videoUrl, provider: "fal" };
  }
  const videoUrl = await dashscopeReplaceCharacter(input);
  return { videoUrl, provider: "dashscope" };
}
