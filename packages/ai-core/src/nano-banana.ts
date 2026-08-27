import type { CharacterLook } from "./character";

export const NANO_BANANA_MODEL = "gemini-2.5-flash-image";
export const NANO_BANANA_FALLBACK_MODEL = "gemini-2.5-flash-image-preview";
export const NANO_BANANA_MISSING_KEY =
  "Cần GEMINI_API_KEY trên máy chủ để Nano Banana vẽ ảnh nhân vật, hoặc dán một ảnh https sẵn có. Không dùng thẻ chữ trên máy.";

export function geminiImageApiKey(): string | null {
  const key = process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
  return key || null;
}

export function nanoBananaGenerateUrl(apiKey: string, model = NANO_BANANA_MODEL): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
}

export function nanoBananaStillPrompt(input: {
  name: string;
  look: CharacterLook;
  bible: string;
}): string {
  const who = input.name.trim().slice(0, 60) || "the presenter";
  const bible = input.bible.replace(/\s+/g, " ").trim().slice(0, 700);
  const lookLine =
    input.look === "cartoon_kid"
      ? "Cute Pixar-like 3D cartoon child, consistent character design."
      : input.look === "teacher"
        ? "Photoreal Vietnamese female teacher, red ao dai, adult."
        : "Photoreal educational presenter, adult.";
  return [
    "Single still frame, 16:9, eye-level, facing camera, even classroom light.",
    lookLine,
    `Name for identity lock only, do not render any text: ${who}.`,
    bible,
    "No on-screen text, no logos, no extra people, no watermark, no nameplate, no caption card.",
  ]
    .filter(Boolean)
    .join(" ");
}

export function parseNanoBananaImage(raw: unknown): { bytes: Buffer; contentType: string } {
  if (!raw || typeof raw !== "object") {
    throw new Error("Nano Banana không trả ảnh.");
  }
  const rec = raw as {
    candidates?: Array<{
      content?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string }; inline_data?: { mime_type?: string; data?: string } }> };
    }>;
    error?: { message?: string };
  };
  if (rec.error?.message) {
    throw new Error(`Nano Banana lỗi: ${rec.error.message.slice(0, 180)}`);
  }
  const parts = rec.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    const inline = part.inlineData ?? part.inline_data;
    const data = inline && "data" in inline ? inline.data : undefined;
    const mime =
      inline && "mimeType" in inline && typeof inline.mimeType === "string"
        ? inline.mimeType
        : inline && "mime_type" in inline && typeof inline.mime_type === "string"
          ? inline.mime_type
          : "image/png";
    if (typeof data === "string" && data.trim()) {
      const bytes = Buffer.from(data, "base64");
      if (bytes.length < 64) throw new Error("Nano Banana trả ảnh rỗng.");
      return { bytes, contentType: mime.startsWith("image/") ? mime : "image/png" };
    }
  }
  throw new Error("Nano Banana không trả file ảnh — chỉ có chữ.");
}

export async function generateNanoBananaStill(input: {
  name: string;
  look: CharacterLook;
  bible: string;
  fetchImpl?: typeof fetch;
}): Promise<{ bytes: Buffer; contentType: string; provider: "nano_banana"; model: string }> {
  const apiKey = geminiImageApiKey();
  if (!apiKey) throw new Error(NANO_BANANA_MISSING_KEY);
  const doFetch = input.fetchImpl ?? fetch;
  const prompt = nanoBananaStillPrompt(input);
  const models = [NANO_BANANA_MODEL, NANO_BANANA_FALLBACK_MODEL];
  let lastError: Error | null = null;
  for (const model of models) {
    try {
      const res = await doFetch(nanoBananaGenerateUrl(apiKey, model), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
        }),
        signal: AbortSignal.timeout(90_000),
      });
      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const message =
          json && typeof json === "object" && "error" in json && json.error && typeof json.error === "object" && "message" in json.error
            ? String((json.error as { message?: unknown }).message ?? "")
            : "";
        throw new Error(`Nano Banana thất bại (${res.status})${message ? `: ${message.slice(0, 160)}` : ""}`);
      }
      const image = parseNanoBananaImage(json);
      return { ...image, provider: "nano_banana", model };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error("Nano Banana lỗi");
    }
  }
  throw lastError ?? new Error("Nano Banana không vẽ được ảnh nhân vật.");
}
