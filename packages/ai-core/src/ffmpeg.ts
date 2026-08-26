export function studioSoundArgs(inputPath: string, outputPath: string): string[] {
  return [
    "-y",
    "-i",
    inputPath,
    "-af",
    "highpass=f=80,lowpass=f=12000,afftdn=nf=-25,loudnorm=I=-16:TP=-1.5:LRA=11",
    "-c:v",
    "copy",
    "-movflags",
    "+faststart",
    outputPath,
  ];
}

export function pictureEnhanceArgs(inputPath: string, outputPath: string): string[] {
  return [
    "-y",
    "-i",
    inputPath,
    "-vf",
    "eq=contrast=1.08:brightness=0.03:saturation=1.12,unsharp=5:5:0.6:5:5:0.0",
    "-c:a",
    "copy",
    "-preset",
    "veryfast",
    "-crf",
    "23",
    "-movflags",
    "+faststart",
    outputPath,
  ];
}

export function silenceTrimArgs(inputPath: string, outputPath: string): string[] {
  return [
    "-y",
    "-i",
    inputPath,
    "-af",
    "silenceremove=start_periods=1:start_threshold=-40dB:start_silence=0.5:stop_periods=-1:stop_threshold=-40dB:stop_silence=0.8",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "23",
    "-movflags",
    "+faststart",
    outputPath,
  ];
}

export function thumbnailArgs(inputPath: string, outputPath: string, seekSeconds: number): string[] {
  const seek = Number.isFinite(seekSeconds) ? Math.max(0, seekSeconds) : 1;
  return ["-y", "-ss", seek.toFixed(2), "-i", inputPath, "-frames:v", "1", "-q:v", "3", outputPath];
}

export function extractSpeechAudioArgs(inputPath: string, outputPath: string): string[] {
  return [
    "-y",
    "-i",
    inputPath,
    "-vn",
    "-ac",
    "1",
    "-ar",
    "16000",
    "-b:a",
    "64k",
    outputPath,
  ];
}

export function titlePosterArgs(
  outputPath: string,
  title: string,
  fontFile: string,
): string[] {
  const safe = title
    .replace(/['\\:]/g, " ")
    .replace(/%/g, " pct ")
    .slice(0, 72);
  const escapedFont = fontFile.replace(/\\/g, "/").replace(/:/g, "\\:");
  return [
    "-y",
    "-f",
    "lavfi",
    "-i",
    "color=c=0x0f172a:s=1280x720:d=0.1",
    "-vf",
    `drawtext=fontfile='${escapedFont}':text='${safe}':fontcolor=white:fontsize=42:x=(w-text_w)/2:y=(h-text_h)/2`,
    "-frames:v",
    "1",
    outputPath,
  ];
}

export const FFMPEG_FONT_CANDIDATES = [
  "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
  "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
  "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
] as const;
