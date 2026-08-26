import {
  defaultElevenLabsVoiceId,
  elevenlabsAddVoiceUrl,
  elevenlabsDeleteVoiceUrl,
  elevenlabsTtsUrl,
} from "./voice";

export function elevenLabsApiKey(): string | null {
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  return key || null;
}

export async function elevenLabsSpeak(input: {
  apiKey: string;
  text: string;
  voiceId?: string;
}): Promise<Buffer> {
  const voiceId = input.voiceId?.trim() || defaultElevenLabsVoiceId();
  const res = await fetch(elevenlabsTtsUrl(voiceId), {
    method: "POST",
    headers: {
      "xi-api-key": input.apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text: input.text.slice(0, 4000),
      model_id: "eleven_multilingual_v2",
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`ElevenLabs TTS thất bại (${res.status}): ${text.slice(0, 180)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

export async function elevenLabsCloneVoice(input: {
  apiKey: string;
  name: string;
  sample: Buffer;
}): Promise<string> {
  if (input.sample.length < 2000) {
    throw new Error("Mẫu giọng quá ngắn để clone");
  }
  const form = new FormData();
  form.append("name", input.name.slice(0, 40) || "edu-overdub");
  form.append("files", new Blob([new Uint8Array(input.sample)], { type: "audio/mpeg" }), "sample.mp3");
  const res = await fetch(elevenlabsAddVoiceUrl(), {
    method: "POST",
    headers: { "xi-api-key": input.apiKey },
    body: form,
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`ElevenLabs clone thất bại (${res.status}): ${text.slice(0, 180)}`);
  }
  const json = (await res.json()) as { voice_id?: string };
  if (!json.voice_id) throw new Error("ElevenLabs không trả voice_id");
  return json.voice_id;
}

export async function elevenLabsDeleteVoice(apiKey: string, voiceId: string): Promise<void> {
  try {
    await fetch(elevenlabsDeleteVoiceUrl(voiceId), {
      method: "DELETE",
      headers: { "xi-api-key": apiKey },
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    // best-effort cleanup
  }
}
