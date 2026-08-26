import { LECTURE_ENHANCE_VF, LECTURE_ONE_PASS_AF, LECTURE_SILENCE_AF, LECTURE_SPEECH_AF } from "./expert-recipe";
import type { FaceRegion, VisualStyle } from "./options";

export function ffmpegThreadCount(): number {
  const raw = Number(process.env.FFMPEG_THREADS);
  if (Number.isFinite(raw) && raw >= 1 && raw <= 16) return Math.floor(raw);
  return 2;
}

export function ffmpegThreadArgs(): string[] {
  return ["-threads", String(ffmpegThreadCount())];
}

export function clampQuickTrim(
  startMs: number,
  endMs: number,
  durationMs: number,
): { startMs: number; endMs: number } {
  const duration = Number.isFinite(durationMs) && durationMs > 400 ? durationMs : Math.max(endMs, 400);
  const start = Math.max(0, Math.min(Number.isFinite(startMs) ? startMs : 0, duration - 400));
  const end = Math.max(start + 400, Math.min(Number.isFinite(endMs) ? endMs : duration, duration));
  return { startMs: Math.round(start), endMs: Math.round(end) };
}

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
      return "hqdn3d=12:10:18:14,eq=saturation=1.7:contrast=1.22:gamma=0.9,unsharp=7:7:1.8:5:5:0.0";
    case "watercolor":
      return "boxblur=2:1,eq=saturation=1.18:contrast=1.04,hqdn3d=6:4:8:6";
    case "flat":
      return "hqdn3d=8:6:12:10,eq=saturation=1.6:contrast=1.2,unsharp=5:5:1.2";
    default: {
      const _never: never = style;
      return _never;
    }
  }
}

/** Full-frame cel-shade (paint + ink). ffmpeg 4.2-safe: hqdn3d, edgedetect, blend. */
export function cartoonPersonGraph(style: VisualStyle): string {
  if (style === "anime") {
    return [
      "[0:v]split=2[paint][ink]",
      "[paint]hqdn3d=12:10:18:14,eq=saturation=1.7:contrast=1.22:gamma=0.9[c]",
      "[ink]edgedetect=mode=colormix:high=0.14[l]",
      "[c][l]blend=all_mode=multiply:all_opacity=0.58,format=yuv420p[v]",
    ].join(";");
  }
  return `[0:v]${toonVf(style)},format=yuv420p[v]`;
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
    LECTURE_SPEECH_AF,
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
    ...ffmpegThreadArgs(),
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
    LECTURE_SILENCE_AF,
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "23",
    ...ffmpegThreadArgs(),
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

export const COURSE_ENHANCE_VF = LECTURE_ENHANCE_VF;

export const SPEECH_FOCUS_AF = LECTURE_SPEECH_AF;

export function courseEnhanceArgs(inputPath: string, outputPath: string): string[] {
  return [
    "-y",
    "-i",
    inputPath,
    "-vf",
    COURSE_ENHANCE_VF,
    "-c:a",
    "copy",
    "-preset",
    "veryfast",
    "-crf",
    "22",
    ...ffmpegThreadArgs(),
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
    SPEECH_FOCUS_AF,
    "-c:v",
    "copy",
    "-movflags",
    "+faststart",
    outputPath,
  ];
}

export function enhanceAndSpeechArgs(inputPath: string, outputPath: string): string[] {
  return [
    "-y",
    "-i",
    inputPath,
    "-vf",
    COURSE_ENHANCE_VF,
    "-af",
    SPEECH_FOCUS_AF,
    "-preset",
    "veryfast",
    "-crf",
    "22",
    "-pix_fmt",
    "yuv420p",
    ...ffmpegThreadArgs(),
    "-movflags",
    "+faststart",
    outputPath,
  ];
}

/** One encode: slide-safe picture + studio speech + silence trim. ffmpeg 4.2-safe. */
export function enhanceSpeechTrimArgs(inputPath: string, outputPath: string): string[] {
  return [
    "-y",
    "-i",
    inputPath,
    "-vf",
    COURSE_ENHANCE_VF,
    "-af",
    LECTURE_ONE_PASS_AF,
    "-preset",
    "veryfast",
    "-crf",
    "22",
    "-pix_fmt",
    "yuv420p",
    ...ffmpegThreadArgs(),
    "-movflags",
    "+faststart",
    outputPath,
  ];
}

export function quickTrimCopyArgs(
  inputPath: string,
  outputPath: string,
  startSec: number,
  durationSec: number,
): string[] {
  const start = Math.max(0, startSec);
  const duration = Math.max(0.4, durationSec);
  return [
    "-y",
    "-ss",
    start.toFixed(3),
    "-i",
    inputPath,
    "-t",
    duration.toFixed(3),
    "-c",
    "copy",
    "-movflags",
    "+faststart",
    outputPath,
  ];
}

export function quickTrimEncodeArgs(
  inputPath: string,
  outputPath: string,
  startSec: number,
  durationSec: number,
): string[] {
  const start = Math.max(0, startSec);
  const duration = Math.max(0.4, durationSec);
  return [
    "-y",
    "-ss",
    start.toFixed(3),
    "-i",
    inputPath,
    "-t",
    duration.toFixed(3),
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "23",
    "-c:a",
    "aac",
    "-pix_fmt",
    "yuv420p",
    ...ffmpegThreadArgs(),
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
      "-filter_complex",
      cartoonPersonGraph(style),
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
      ...ffmpegThreadArgs(),
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
    ...ffmpegThreadArgs(),
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

/** Slow Ken Burns over a still — Pictory-safe, no third-party stock. Fail-soft if zoompan is missing. */
export function kenBurnsStillArgs(poster: string, outputPath: string, durationSec: number): string[] {
  const seconds = Math.max(0.8, Math.min(30, durationSec));
  const frames = Math.max(20, Math.round(seconds * 25));
  return [
    "-y",
    "-loop",
    "1",
    "-i",
    poster,
    "-vf",
    `scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,zoompan=z='min(zoom+0.0004,1.08)':d=${frames}:s=1280x720:fps=25,format=yuv420p`,
    "-t",
    String(seconds),
    "-an",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "23",
    "-pix_fmt",
    "yuv420p",
    ...ffmpegThreadArgs(),
    outputPath,
  ];
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
    ...ffmpegThreadArgs(),
    "-c:a",
    "aac",
    "-shortest",
    "-movflags",
    "+faststart",
    outputPath,
  ];
}

export function replaceAudioArgs(videoPath: string, audioPath: string, outputPath: string): string[] {
  return [
    "-y",
    "-i",
    videoPath,
    "-i",
    audioPath,
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-shortest",
    "-movflags",
    "+faststart",
    outputPath,
  ];
}

export function fitAudioDurationArgs(inputPath: string, outputPath: string, durationSec: number, tempo: number): string[] {
  const seconds = Math.max(0.4, durationSec);
  const safeTempo = Math.max(0.5, Math.min(2, tempo));
  return [
    "-y",
    "-i",
    inputPath,
    "-af",
    `atempo=${safeTempo},apad=pad_dur=3600`,
    "-t",
    seconds.toFixed(3),
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    outputPath,
  ];
}

export function extractAudioSegmentArgs(inputPath: string, outputPath: string, startSec: number, durationSec: number): string[] {
  return [
    "-y",
    "-ss",
    Math.max(0, startSec).toFixed(3),
    "-t",
    Math.max(0.2, durationSec).toFixed(3),
    "-i",
    inputPath,
    "-vn",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    outputPath,
  ];
}

export function concatAudioArgs(listPath: string, outputPath: string): string[] {
  return [
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    listPath,
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    outputPath,
  ];
}

/** Talking-head reframe: pull eyes toward frame center. Not per-frame iris warp. */
export function eyeContactReframeArgs(inputPath: string, outputPath: string): string[] {
  return [
    "-y",
    "-i",
    inputPath,
    "-vf",
    "scale=trunc(iw/2)*2:trunc(ih/2)*2,crop=iw*0.86:ih*0.86:(iw-ow)/2:(ih-oh)*0.22,scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p,setsar=1",
    "-c:a",
    "copy",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "23",
    "-pix_fmt",
    "yuv420p",
    ...ffmpegThreadArgs(),
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
