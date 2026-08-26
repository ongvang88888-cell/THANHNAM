import { FFMPEG_FONT_CANDIDATES } from "./ffmpeg";

export interface SpeechResult {
  text: string;
  language?: string;
  segments: Array<{ start: number; end: number; text: string }>;
  provider: string;
}

export interface ImageGenResult {
  bytes: Buffer;
  contentType: string;
  provider: string;
}

export interface LessonCopyResult {
  title: string;
  description: string;
  tags: string[];
  provider: string;
}

export interface AiPort {
  id: string;
  transcribe(input: { bytes: Buffer; filename: string; mime: string }): Promise<SpeechResult>;
  generateCover(input: { title: string; prompt?: string }): Promise<ImageGenResult>;
  suggestLessonCopy(input: { title: string; transcript?: string }): Promise<LessonCopyResult>;
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildTitlePosterSvg(title: string): string {
  const line = escapeXml(title.trim().slice(0, 80) || "Bài học");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1d4ed8"/>
    </linearGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#g)"/>
  <text x="640" y="360" fill="#ffffff" font-size="48" font-family="DejaVu Sans, Arial, sans-serif" text-anchor="middle">${line}</text>
</svg>
`;
}

export function heuristicLessonCopy(title: string, transcript?: string): LessonCopyResult {
  const clean = title.trim() || "Bài học mới";
  const words = clean
    .split(/[\s,/|:._-]+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3)
    .slice(0, 6);
  const snippet = transcript?.replace(/\s+/g, " ").trim().slice(0, 220);
  return {
    title: clean.slice(0, 80),
    description: snippet
      ? `${clean}. ${snippet}`
      : `Bài giảng: ${clean}. Xem video, ghi chú ý chính và luyện tập sau bài.`,
    tags: words.length > 0 ? words : ["bai-hoc", "video"],
    provider: "null",
  };
}

export class NullAiAdapter implements AiPort {
  readonly id = "null";

  async transcribe(): Promise<SpeechResult> {
    return {
      text: "",
      segments: [],
      provider: "null",
    };
  }

  async generateCover(input: { title: string; prompt?: string }): Promise<ImageGenResult> {
    return {
      bytes: Buffer.from(buildTitlePosterSvg(input.prompt?.trim() || input.title), "utf8"),
      contentType: "image/svg+xml",
      provider: "null",
    };
  }

  async suggestLessonCopy(input: { title: string; transcript?: string }): Promise<LessonCopyResult> {
    return heuristicLessonCopy(input.title, input.transcript);
  }
}

function parseJsonObject(text: string): Record<string, unknown> | null {
  const stripped = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try {
    const parsed: unknown = JSON.parse(stripped);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    const start = stripped.indexOf("{");
    const end = stripped.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        const parsed: unknown = JSON.parse(stripped.slice(start, end + 1));
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch {
        return null;
      }
    }
  }
  return null;
}

function copyFromUnknown(raw: Record<string, unknown> | null, fallbackTitle: string, provider: string): LessonCopyResult {
  const base = heuristicLessonCopy(fallbackTitle);
  if (!raw) return { ...base, provider };
  const title = typeof raw.title === "string" && raw.title.trim() ? raw.title.trim().slice(0, 80) : base.title;
  const description =
    typeof raw.description === "string" && raw.description.trim() ? raw.description.trim().slice(0, 800) : base.description;
  const tags = Array.isArray(raw.tags)
    ? raw.tags.filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0).slice(0, 8)
    : base.tags;
  return { title, description, tags, provider };
}

async function postJson<T>(url: string, headers: Record<string, string>, body: unknown, timeoutMs: number): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`AI request failed (${res.status}): ${text.slice(0, 180)}`);
  }
  return (await res.json()) as T;
}

class OpenAiAdapter implements AiPort {
  readonly id = "openai";
  constructor(private readonly apiKey: string) {}

  async transcribe(input: { bytes: Buffer; filename: string; mime: string }): Promise<SpeechResult> {
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(input.bytes)], { type: input.mime }), input.filename);
    form.append("model", "whisper-1");
    form.append("response_format", "verbose_json");
    form.append("timestamp_granularities[]", "segment");
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: form,
      signal: AbortSignal.timeout(180_000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Whisper failed (${res.status}): ${text.slice(0, 180)}`);
    }
    const json = (await res.json()) as {
      text?: string;
      language?: string;
      segments?: Array<{ start?: number; end?: number; text?: string }>;
    };
    return {
      text: json.text?.trim() ?? "",
      language: json.language,
      segments: (json.segments ?? [])
        .filter((row) => typeof row.text === "string" && row.text.trim())
        .map((row) => ({
          start: Number(row.start ?? 0),
          end: Number(row.end ?? row.start ?? 0),
          text: String(row.text).trim(),
        })),
      provider: "openai",
    };
  }

  async generateCover(input: { title: string; prompt?: string }): Promise<ImageGenResult> {
    const prompt =
      input.prompt?.trim() ||
      `Educational online-course cover, no logos, no readable text, clean cinematic lighting, classroom or study mood for: ${input.title}`;
    const json = await postJson<{ data?: Array<{ url?: string; b64_json?: string }> }>(
      "https://api.openai.com/v1/images/generations",
      { Authorization: `Bearer ${this.apiKey}` },
      { model: "dall-e-3", prompt, size: "1792x1024", n: 1, response_format: "b64_json" },
      90_000,
    );
    const first = json.data?.[0];
    if (first?.b64_json) {
      return { bytes: Buffer.from(first.b64_json, "base64"), contentType: "image/png", provider: "openai" };
    }
    if (first?.url) {
      const img = await fetch(first.url, { signal: AbortSignal.timeout(60_000) });
      if (!img.ok) throw new Error("OpenAI image download failed");
      return {
        bytes: Buffer.from(await img.arrayBuffer()),
        contentType: img.headers.get("content-type") || "image/png",
        provider: "openai",
      };
    }
    throw new Error("OpenAI image response empty");
  }

  async suggestLessonCopy(input: { title: string; transcript?: string }): Promise<LessonCopyResult> {
    const json = await postJson<{ choices?: Array<{ message?: { content?: string } }> }>(
      "https://api.openai.com/v1/chat/completions",
      { Authorization: `Bearer ${this.apiKey}` },
      {
        model: "gpt-4o-mini",
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content:
              "Bạn là biên tập viên khóa học tiếng Việt. Trả về JSON {title, description, tags}. title <= 80 ký tự. description 2-4 câu. tags 3-6 từ khóa. Không bịa kiến thức ngoài transcript.",
          },
          {
            role: "user",
            content: JSON.stringify({ title: input.title, transcript: input.transcript?.slice(0, 6000) ?? "" }),
          },
        ],
      },
      60_000,
    );
    return copyFromUnknown(parseJsonObject(json.choices?.[0]?.message?.content ?? ""), input.title, "openai");
  }
}

class GroqSpeechAdapter {
  constructor(private readonly apiKey: string) {}

  async transcribe(input: { bytes: Buffer; filename: string; mime: string }): Promise<SpeechResult> {
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(input.bytes)], { type: input.mime }), input.filename);
    form.append("model", "whisper-large-v3");
    form.append("response_format", "verbose_json");
    const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: form,
      signal: AbortSignal.timeout(180_000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Groq Whisper failed (${res.status}): ${text.slice(0, 180)}`);
    }
    const json = (await res.json()) as {
      text?: string;
      language?: string;
      segments?: Array<{ start?: number; end?: number; text?: string }>;
    };
    return {
      text: json.text?.trim() ?? "",
      language: json.language,
      segments: (json.segments ?? [])
        .filter((row) => typeof row.text === "string" && row.text.trim())
        .map((row) => ({
          start: Number(row.start ?? 0),
          end: Number(row.end ?? row.start ?? 0),
          text: String(row.text).trim(),
        })),
      provider: "groq",
    };
  }
}

class GeminiCopyAdapter {
  constructor(private readonly apiKey: string) {}

  async suggestLessonCopy(input: { title: string; transcript?: string }): Promise<LessonCopyResult> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(this.apiKey)}`;
    const json = await postJson<{
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    }>(
      url,
      {},
      {
        contents: [
          {
            parts: [
              {
                text: `Viết JSON {title, description, tags} tiếng Việt cho bài học "${input.title}". Transcript: ${input.transcript?.slice(0, 6000) ?? ""}`,
              },
            ],
          },
        ],
        generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
      },
      60_000,
    );
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    return copyFromUnknown(parseJsonObject(text), input.title, "gemini");
  }
}

export function createAiPortFromEnv(): AiPort {
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const groqKey = process.env.GROQ_API_KEY?.trim();
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const fallback = new NullAiAdapter();
  const openai = openaiKey ? new OpenAiAdapter(openaiKey) : null;
  const groq = groqKey ? new GroqSpeechAdapter(groqKey) : null;
  const gemini = geminiKey ? new GeminiCopyAdapter(geminiKey) : null;
  const id = openai ? "openai" : groq ? "groq" : gemini ? "gemini" : "null";
  return {
    id,
    transcribe: (input) => (openai ?? groq ?? fallback).transcribe(input),
    generateCover: (input) => (openai ?? fallback).generateCover(input),
    suggestLessonCopy: (input) => (openai ?? gemini ?? fallback).suggestLessonCopy(input),
  };
}

export function firstExistingFont(exists: (path: string) => boolean): string | null {
  for (const candidate of FFMPEG_FONT_CANDIDATES) {
    if (exists(candidate)) return candidate;
  }
  return null;
}
