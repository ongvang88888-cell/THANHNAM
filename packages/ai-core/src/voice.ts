export const TTS_CHUNK_MAX = 900;

export function chunkTextForTts(text: string, maxChars = TTS_CHUNK_MAX): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  if (clean.length <= maxChars) return [clean];
  const parts: string[] = [];
  let rest = clean;
  while (rest.length > maxChars) {
    const window = rest.slice(0, maxChars);
    const splitAt = Math.max(window.lastIndexOf(". "), window.lastIndexOf("? "), window.lastIndexOf("! "), window.lastIndexOf(", "), window.lastIndexOf(" "));
    const cut = splitAt >= 40 ? splitAt + 1 : maxChars;
    parts.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) parts.push(rest);
  return parts.filter((row) => row.length > 0);
}

/** Stretch or squeeze spoken audio so a replacement fits the original slot. */
export function atempoForFit(sourceSec: number, targetSec: number): number {
  const source = Math.max(0.2, sourceSec);
  const target = Math.max(0.4, targetSec);
  const ratio = source / target;
  return Math.max(0.5, Math.min(2, Number(ratio.toFixed(3))));
}

export function elevenlabsAddVoiceUrl(): string {
  return "https://api.elevenlabs.io/v1/voices/add";
}

export function elevenlabsTtsUrl(voiceId: string): string {
  return `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`;
}

export function elevenlabsDeleteVoiceUrl(voiceId: string): string {
  return `https://api.elevenlabs.io/v1/voices/${encodeURIComponent(voiceId)}`;
}

export function defaultElevenLabsVoiceId(): string {
  return process.env.ELEVENLABS_VOICE_ID?.trim() || "EXAVITQu4vr4xnSDxMaL";
}
