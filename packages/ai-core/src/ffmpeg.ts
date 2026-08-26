import type { FaceRegion, VisualStyle } from "./options";

export function sanitizeDrawText(title: string): string {
  return title
    .replace(/['\\:]/g, " ")
    .replace(/%/g, " pct ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 72);
}

export function styleBackdrop(style: VisualStyle): string {
  switch (style) {
    case "anime":
      return "0x1d4ed8";
    case "watercolor":
      return "0x57534e";
    case "flat":
      return "0x0f172a";
    default: {
      const _never: never = style;
      return _never;
    }
  }
}

export function toonVf(style: VisualStyle): string {
  switch (style) {
    case "anime":
      return "hqdn3d=4:3:6:6,eq=saturation=1.45:contrast=1.12:gamma=0.96,unsharp=5:5:1.0";
    case "watercolor":
      return "boxblur=2:1,eq=saturation=1.18:contrast=1.04,hqdn3d=6:4:8:6";
    case "flat":
      return "hqdn3d=3:2:5:5,eq=saturation=1.55:contrast=1.15,unsharp=5:5:0.8";
    default: {
      const _never: never = style;
      return _never;
    }
  }
}

export function pipGeometry(region: Exclude<FaceRegion, "full">): { crop: string; overlay: string } {
  const w = "iw*0.32";
  const h = "ih*0.32";
  const pad = 20;
  switch (region) {
    case "pip_br":
      return { crop: `crop=${w}:${h}:iw-${w}-${pad}:ih-${h}-${pad}`, overlay: `overlay=W-w-${pad}:H-h-${pad}` };
    case "pip_bl":
      return { crop: `crop=${w}:${h}:${pad}:ih-${h}-${pad}`, overlay: `overlay=${pad}:H-h-${pad}` };
    case "pip_tr":
      return { crop: `crop=${w}:${h}:iw-${w}-${pad}:${pad}`, overlay: `overlay=W-w-${pad}:${pad}` };
    case "pip_tl":
      return { crop: `crop=${w}:${h}:${pad}:${pad}`, overlay: `overlay=${pad}:${pad}` };
    default: {
      const _never: never = region;
      return _never;
    }
  }
}

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
  style: VisualStyle = "flat",
): string[] {
  const safe = sanitizeDrawText(title);
  const escapedFont = fontFile.replace(/\\/g, "/").replace(/:/g, "\\:");
  return [
    "-y",
    "-f",
    "lavfi",
    "-i",
    `color=c=${styleBackdrop(style)}:s=1280x720:d=0.1`,
    "-vf",
    `drawtext=fontfile='${escapedFont}':text='${safe}':fontcolor=white:fontsize=42:x=(w-text_w)/2:y=(h-text_h)/2`,
    "-frames:v",
    "1",
    outputPath,
  ];
}

export function courseEnhanceArgs(inputPath: string, outputPath: string): string[] {
  return [
    "-y",
    "-i",
    inputPath,
    "-vf",
    "hqdn3d=1.2:1.0:4:4,unsharp=3:3:0.35:3:3:0.0,eq=contrast=1.04:brightness=0.01:saturation=1.03",
    "-c:a",
    "copy",
    "-preset",
    "veryfast",
    "-crf",
    "22",
    "-movflags",
    "+faststart",
    outputPath,
  ];
}

export function speechFocusArgs(inputPath: string, outputPath: string): string[] {
  return [
    "-y",
    "-i",
    inputPath,
    "-af",
    "highpass=f=140,lowpass=f=3800,afftdn=nf=-22,loudnorm=I=-16:TP=-1.5:LRA=11",
    "-c:v",
    "copy",
    "-movflags",
    "+faststart",
    outputPath,
  ];
}

export function toonTalkingHeadArgs(
  inputPath: string,
  outputPath: string,
  region: FaceRegion,
  style: VisualStyle,
): string[] {
  const look = toonVf(style);
  if (region === "full") {
    return [
      "-y",
      "-i",
      inputPath,
      "-vf",
      look,
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
  const geometry = pipGeometry(region);
  return [
    "-y",
    "-i",
    inputPath,
    "-filter_complex",
    `[0:v]split=2[base][face];[face]${geometry.crop},${look}[toon];[base][toon]${geometry.overlay}[v]`,
    "-map",
    "[v]",
    "-map",
    "0:a?",
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

export function captionStillArgs(
  inputImage: string,
  outputPath: string,
  title: string,
  fontFile: string,
): string[] {
  const safe = sanitizeDrawText(title);
  const escapedFont = fontFile.replace(/\\/g, "/").replace(/:/g, "\\:");
  return [
    "-y",
    "-i",
    inputImage,
    "-vf",
    `scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,drawtext=fontfile='${escapedFont}':text='${safe}':fontcolor=white:fontsize=36:borderw=2:bordercolor=black:x=(w-text_w)/2:y=h-80`,
    "-frames:v",
    "1",
    outputPath,
  ];
}

export function extractLessonAudioArgs(inputPath: string, outputPath: string): string[] {
  return ["-y", "-i", inputPath, "-vn", "-c:a", "aac", "-b:a", "128k", outputPath];
}

export function illustratedConcatArgs(listPath: string, audioPath: string, outputPath: string): string[] {
  return [
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    listPath,
    "-i",
    audioPath,
    "-map",
    "0:v",
    "-map",
    "1:a",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "23",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-shortest",
    "-movflags",
    "+faststart",
    outputPath,
  ];
}

export const FFMPEG_FONT_CANDIDATES = [
  "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
  "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
  "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
] as const;
