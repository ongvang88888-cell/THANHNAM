export interface AiEditOptions {
  seekSeconds?: number;
  prompt?: string;
}

const ALLOWED = new Set(["seekSeconds", "prompt"]);

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
  return out;
}
