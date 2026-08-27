import type { CharacterLook } from "./character";
import { LECTURE_ENHANCE_VF, LECTURE_ONE_PASS_AF, LECTURE_SILENCE_AF, LECTURE_SPEECH_AF } from "./expert-recipe";
import type { FaceRegion, ToonStrength, VisualStyle } from "./options";

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
    case "trend":
      return "0xf59e0b";
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

export function toonMixOpacity(strength: ToonStrength): number {
  switch (strength) {
    case "low":
      return 0.55;
    case "medium":
      return 0.78;
    case "high":
      return 0.92;
    default: {
      const _never: never = strength;
      return _never;
    }
  }
}

/** Paint pass only. Prefer cartoonStyleGraph for the full expert look. */
export function cartoonPaintVf(style: VisualStyle): string {
  switch (style) {
    case "trend":
      return "smartblur=lr=3.2:ls=-0.85:lt=20,eq=saturation=1.88:contrast=1.34:gamma=0.86,lutyuv=y='val-mod(val\\,36)':u='val-mod(val\\,24)':v='val-mod(val\\,24)'";
    case "anime":
      return "smartblur=lr=2.2:ls=-0.55:lt=16,eq=saturation=1.52:contrast=1.16:gamma=0.93,lutyuv=y='val-mod(val\\,24)':u='val-mod(val\\,16)':v='val-mod(val\\,16)'";
    case "watercolor":
      return "boxblur=2:1,eq=saturation=1.22:contrast=1.05:gamma=1.02";
    case "flat":
      return "smartblur=lr=2.6:ls=-0.7:lt=18,eq=saturation=1.62:contrast=1.24:gamma=0.9,lutyuv=y='val-mod(val\\,32)':u='val-mod(val\\,20)':v='val-mod(val\\,20)'";
    default: {
      const _never: never = style;
      return _never;
    }
  }
}

export function toonVf(style: VisualStyle): string {
  return cartoonPaintVf(style);
}

export function cartoonInkVf(style: VisualStyle): string | null {
  switch (style) {
    case "trend":
      return "edgedetect=mode=colormix:low=0.05:high=0.14";
    case "anime":
      return "edgedetect=mode=colormix:low=0.04:high=0.12";
    case "flat":
      return "edgedetect=mode=colormix:low=0.03:high=0.09";
    case "watercolor":
      return null;
    default: {
      const _never: never = style;
      return _never;
    }
  }
}

export function cartoonInkOpacity(style: VisualStyle): number {
  switch (style) {
    case "trend":
      return 0.42;
    case "anime":
      return 0.52;
    case "flat":
      return 0.64;
    case "watercolor":
      return 0;
    default: {
      const _never: never = style;
      return _never;
    }
  }
}

/**
 * Expert local restyle (ffmpeg 4.2-safe): temporal stabilize → flatten/quantize →
 * ink → mix with original → deflicker. Keeps source motion and audio mapping.
 */
export function cartoonStyleGraph(
  source: string,
  dest: string,
  style: VisualStyle,
  strength: ToonStrength = "high",
): string {
  const mix = style === "trend" && strength === "high" ? 1 : toonMixOpacity(strength);
  const paint = cartoonPaintVf(style);
  const ink = cartoonInkVf(style);
  const inkOp = cartoonInkOpacity(style);
  const stable = `s${dest}`;
  const keep = `k${dest}`;
  const paintL = `p${dest}`;
  const inkL = `i${dest}`;
  const flat = `f${dest}`;
  const lines = `n${dest}`;
  const cel = `c${dest}`;
  if (ink && inkOp > 0) {
    return [
      `[${source}]hqdn3d=8:6:16:12[${stable}]`,
      `[${stable}]split=3[${keep}][${paintL}][${inkL}]`,
      `[${paintL}]${paint}[${flat}]`,
      `[${inkL}]${ink}[${lines}]`,
      `[${flat}][${lines}]blend=all_mode=multiply:all_opacity=${inkOp}[${cel}]`,
      `[${keep}][${cel}]blend=all_mode=normal:all_opacity=${mix},deflicker=mode=am:size=5,format=yuv420p[${dest}]`,
    ].join(";");
  }
  return [
    `[${source}]hqdn3d=6:4:12:10[${stable}]`,
    `[${stable}]split=2[${keep}][${paintL}]`,
    `[${paintL}]${paint}[${cel}]`,
    `[${keep}][${cel}]blend=all_mode=normal:all_opacity=${mix},deflicker=mode=am:size=5,format=yuv420p[${dest}]`,
  ].join(";");
}

export function cartoonPersonGraph(style: VisualStyle, strength: ToonStrength = "high"): string {
  return cartoonStyleGraph("0:v", "v", style, strength);
}

export function speakerGeometry(): { crop: string; overlay: string } {
  return {
    crop: "crop=iw*0.64:ih*0.88:(iw-ow)/2:ih*0.02",
    overlay: "overlay=(W-w)/2:H*0.03",
  };
}

export function pipGeometry(region: Exclude<FaceRegion, "full" | "speaker">): { crop: string; overlay: string } {
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

export function overlayGeometry(region: Exclude<FaceRegion, "full">): { crop: string; overlay: string } {
  if (region === "speaker") return speakerGeometry();
  return pipGeometry(region);
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

export function characterCardBackdrop(look: CharacterLook): string {
  if (look === "cartoon_kid") return "0x0ea5e9";
  if (look === "teacher") return "0xb91c1c";
  return "0x1e3a8a";
}

export function characterCardSubtitle(look: CharacterLook): string {
  if (look === "cartoon_kid") return "Nhan vat 3D ao";
  if (look === "teacher") return "Giang vien ao";
  return "Nguoi dan ao";
}

/** Nameplate still for the shared presenter when there is no photo / HeyGen key. */
export function characterCardStillArgs(
  outputPath: string,
  name: string,
  look: CharacterLook,
  fontFile: string,
): string[] {
  const title = sanitizeDrawText(name || "Nguoi dan ao");
  const sub = sanitizeDrawText(characterCardSubtitle(look));
  const escapedFont = fontFile.replace(/\\/g, "/").replace(/:/g, "\\:");
  return [
    "-y",
    "-f",
    "lavfi",
    "-i",
    `color=c=${characterCardBackdrop(look)}:s=1280x720:d=0.1`,
    "-vf",
    `drawtext=fontfile='${escapedFont}':text='${title}':fontcolor=white:fontsize=56:x=(w-text_w)/2:y=(h-text_h)/2-28,drawtext=fontfile='${escapedFont}':text='${sub}':fontcolor=0xfff7ed:fontsize=28:x=(w-text_w)/2:y=(h-text_h)/2+36`,
    "-frames:v",
    "1",
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
  strength: ToonStrength = "high",
): string[] {
  const graph =
    region === "full"
      ? cartoonPersonGraph(style, strength)
      : (() => {
          const geometry = overlayGeometry(region);
          return [
            "[0:v]split=2[base][face]",
            `[face]${geometry.crop},scale=trunc(iw/2)*2:trunc(ih/2)*2[src]`,
            cartoonStyleGraph("src", "toon", style, strength),
            `[base][toon]${geometry.overlay}[v]`,
          ].join(";");
        })();
  return [
    "-y",
    "-i",
    inputPath,
    "-filter_complex",
    graph,
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

/** Cover the filmed speaker with a looped AI clip. Keeps lecture audio. ffmpeg 4.2-safe. */
export function characterReplaceCoverGraph(region: FaceRegion): string {
  switch (region) {
    case "full":
      return [
        "[1:v][0:v]scale2ref=w=main_w:h=main_h[ov][base]",
        "[ov]scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p[ov2]",
        "[base][ov2]overlay=0:0:shortest=1[v]",
      ].join(";");
    case "speaker":
      return [
        "[1:v][0:v]scale2ref=w=main_w*0.64:h=main_h*0.88[ov][base]",
        "[ov]scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p[ov2]",
        `[base][ov2]${speakerGeometry().overlay}:shortest=1[v]`,
      ].join(";");
    case "pip_br":
    case "pip_bl":
    case "pip_tr":
    case "pip_tl":
      return [
        "[1:v][0:v]scale2ref=w=main_w*0.42:h=main_h*0.72[ov][base]",
        "[ov]scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p[ov2]",
        `[base][ov2]${pipGeometry(region).overlay}:shortest=1[v]`,
      ].join(";");
    default: {
      const _never: never = region;
      return _never;
    }
  }
}

export function characterReplaceCoverArgs(
  lecturePath: string,
  overlayPath: string,
  outputPath: string,
  region: FaceRegion,
): string[] {
  return [
    "-y",
    "-i",
    lecturePath,
    "-stream_loop",
    "-1",
    "-i",
    overlayPath,
    "-filter_complex",
    characterReplaceCoverGraph(region),
    "-map",
    "[v]",
    "-map",
    "0:a?",
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
    "-b:a",
    "128k",
    "-shortest",
    "-movflags",
    "+faststart",
    outputPath,
  ];
}

/** PIP a short character clip onto a lecture. Keeps lecture audio. ffmpeg 4.2-safe. */
export function characterPipOverlayArgs(
  lecturePath: string,
  overlayPath: string,
  outputPath: string,
  region: Exclude<FaceRegion, "full" | "speaker">,
  overlayDurationSec: number,
): string[] {
  const seconds = Math.max(1, Math.min(20, overlayDurationSec));
  const pos = pipGeometry(region).overlay;
  return [
    "-y",
    "-i",
    lecturePath,
    "-i",
    overlayPath,
    "-filter_complex",
    `[1:v]scale=iw*0.28:-2,scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p[ov];[0:v][ov]${pos}:enable='lte(t,${seconds.toFixed(2)})'[v]`,
    "-map",
    "[v]",
    "-map",
    "0:a?",
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
    "-b:a",
    "128k",
    "-movflags",
    "+faststart",
    outputPath,
  ];
}

export function scaleClipKeepAudioArgs(inputPath: string, outputPath: string): string[] {
  return [
    "-y",
    "-i",
    inputPath,
    "-vf",
    "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,fps=25,format=yuv420p,setsar=1",
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
    "-ar",
    "44100",
    "-ac",
    "2",
    ...ffmpegThreadArgs(),
    "-movflags",
    "+faststart",
    outputPath,
  ];
}

export function scaleClipSilentAudioArgs(inputPath: string, outputPath: string): string[] {
  return [
    "-y",
    "-i",
    inputPath,
    "-f",
    "lavfi",
    "-i",
    "anullsrc=channel_layout=stereo:sample_rate=44100",
    "-vf",
    "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,fps=25,format=yuv420p,setsar=1",
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
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
    "-ar",
    "44100",
    "-ac",
    "2",
    "-shortest",
    ...ffmpegThreadArgs(),
    "-movflags",
    "+faststart",
    outputPath,
  ];
}

export function concatNormalizedArgs(listPath: string, outputPath: string): string[] {
  return ["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", "-movflags", "+faststart", outputPath];
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

export function extractVideoSegmentArgs(inputPath: string, outputPath: string, startSec: number, durationSec: number): string[] {
  return [
    "-y",
    "-ss",
    Math.max(0, startSec).toFixed(3),
    "-t",
    Math.max(0.2, durationSec).toFixed(3),
    "-i",
    inputPath,
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
