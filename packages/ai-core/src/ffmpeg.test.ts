import { describe, expect, it } from "vitest";
import {
  cartoonPersonGraph,
  cartoonStyleGraph,
  courseEnhanceArgs,
  clampQuickTrim,
  enhanceAndSpeechArgs,
  enhanceSpeechTrimArgs,
  kenBurnsStillArgs,
  quickTrimCopyArgs,
  extractSpeechAudioArgs,
  ffmpegThreadArgs,
  ffmpegThreadCount,
  illustratedConcatArgs,
  pictureEnhanceArgs,
  silenceTrimArgs,
  speechFocusArgs,
  studioSoundArgs,
  thumbnailArgs,
  titlePosterArgs,
  speakerGeometry,
  toonMixOpacity,
  toonTalkingHeadArgs,
  concatAudioArgs,
  eyeContactReframeArgs,
  fitAudioDurationArgs,
  replaceAudioArgs,
} from "./ffmpeg";

describe("ffmpeg arg builders", () => {
  it("keeps studio sound video stream", () => {
    const args = studioSoundArgs("in.mp4", "out.mp4");
    expect(args.some((a) => a.includes("afftdn=") && a.includes("loudnorm="))).toBe(true);
    expect(args.slice(args.indexOf("-c:v"), args.indexOf("-c:v") + 2)).toEqual(["-c:v", "copy"]);
  });

  it("enhances picture without touching audio codec", () => {
    const args = pictureEnhanceArgs("in.mp4", "out.mp4");
    expect(args.some((a) => a.includes("unsharp"))).toBe(true);
    expect(args).toContain("-c:a");
  });

  it("trims silence with ffmpeg 4.2-safe params", () => {
    const args = silenceTrimArgs("in.mp4", "out.mp4");
    const filter = args.find((a) => a.startsWith("silenceremove="));
    expect(filter).toContain("start_duration=0.45");
    expect(filter).toContain("stop_duration=0.7");
    expect(filter).not.toContain("start_silence");
    expect(filter).not.toContain("stop_silence");
    expect(args).toContain("veryfast");
  });

  it("clamps thumbnail seek", () => {
    expect(thumbnailArgs("in.mp4", "t.jpg", -3)).toContain("0.00");
    expect(extractSpeechAudioArgs("in.mp4", "a.mp3")).toContain("16000");
    expect(titlePosterArgs("p.jpg", "Hi:there", "/a/b.ttf").join(" ")).toContain("Hi there");
  });

  it("keeps slide-safe enhance milder than the punchy grade", () => {
    const args = courseEnhanceArgs("in.mp4", "out.mp4");
    expect(args.some((a) => a.includes("hqdn3d=") && a.includes("unsharp=3:3"))).toBe(true);
    expect(args).toContain("-c:a");
  });

  it("focuses speech and copies the video stream", () => {
    const args = speechFocusArgs("in.mp4", "out.mp4");
    expect(args.some((a) => a.includes("highpass=f=90") && a.includes("lowpass=f=7500"))).toBe(true);
    expect(args.slice(args.indexOf("-c:v"), args.indexOf("-c:v") + 2)).toEqual(["-c:v", "copy"]);
  });

  it("cartoons the full person frame with ink, mix, and deflicker", () => {
    const graph = cartoonPersonGraph("anime", "high");
    expect(graph).toContain("hqdn3d=");
    expect(graph).toContain("smartblur=");
    expect(graph).toContain("edgedetect=");
    expect(graph).toContain("blend=all_mode=multiply");
    expect(graph).toContain("blend=all_mode=normal:all_opacity=0.92");
    expect(graph).toContain("deflicker=");
    const watercolor = cartoonPersonGraph("watercolor", "low");
    expect(watercolor).not.toContain("edgedetect=");
    expect(watercolor).toContain("all_opacity=0.55");
    expect(watercolor).toContain("deflicker=");
    const full = toonTalkingHeadArgs("in.mp4", "out.mp4", "full", "anime", "high");
    expect(full.join(" ")).toContain("filter_complex");
    expect(full.join(" ")).toContain("edgedetect=");
    expect(full).toContain("-map");
    const pip = toonTalkingHeadArgs("in.mp4", "out.mp4", "pip_br", "flat", "medium");
    expect(pip.join(" ")).toContain("overlay=W-w-20:H-h-20");
    expect(pip.join(" ")).toContain("edgedetect=");
    expect(pip).toContain("-c:a");
    const speaker = toonTalkingHeadArgs("in.mp4", "out.mp4", "speaker", "anime");
    expect(speaker.join(" ")).toContain(speakerGeometry().crop);
    expect(speaker.join(" ")).toContain("overlay=(W-w)/2:H*0.03");
    expect(speakerGeometry().crop).toContain("iw*0.64");
    expect(toonMixOpacity("medium")).toBe(0.78);
    expect(cartoonStyleGraph("src", "toon", "anime")).toContain("[src]");
    expect(cartoonStyleGraph("src", "toon", "anime")).toContain("[toon]");
    const trend = cartoonPersonGraph("trend", "high");
    expect(trend).toContain("saturation=1.88");
    expect(trend).toContain("all_opacity=1");
    expect(trend).toContain("edgedetect=");
  });

  it("caps ffmpeg threads so two lecture jobs cannot pin every vCPU", () => {
    const previous = process.env.FFMPEG_THREADS;
    delete process.env.FFMPEG_THREADS;
    expect(ffmpegThreadCount()).toBe(2);
    expect(ffmpegThreadArgs()).toEqual(["-threads", "2"]);
    process.env.FFMPEG_THREADS = "3";
    expect(ffmpegThreadCount()).toBe(3);
    if (previous === undefined) delete process.env.FFMPEG_THREADS;
    else process.env.FFMPEG_THREADS = previous;
  });

  it("combines slide-safe enhance with speech-focus in one encode", () => {
    const args = enhanceAndSpeechArgs("in.mp4", "out.mp4");
    expect(args.some((a) => a.includes("hqdn3d=") && a.includes("unsharp=3:3"))).toBe(true);
    expect(args.some((a) => a.includes("highpass=f=90") && a.includes("lowpass=f=7500"))).toBe(true);
    expect(args.some((a) => a.includes("format=yuv420p"))).toBe(true);
    expect(args).toContain("yuv420p");
    expect(args).toContain("-threads");
    expect(args).not.toContain("-c:v");
    expect(args).not.toContain("-c:a");
  });

  it("does enhance + silence + loudnorm in a single 4.2-safe encode", () => {
    const args = enhanceSpeechTrimArgs("in.mp4", "out.mp4");
    const af = args.find((a) => a.includes("silenceremove="));
    expect(af).toBeTruthy();
    expect(af).toContain("start_duration=0.45");
    expect(af).not.toContain("start_silence");
    expect(af).toContain("loudnorm=");
    expect(args).toContain("-threads");
    expect(args).toContain("yuv420p");
  });

  it("builds a stream-copy trim for post-AI adjust", () => {
    const args = quickTrimCopyArgs("in.mp4", "out.mp4", 1.2, 8);
    expect(args).toContain("-ss");
    expect(args).toContain("1.200");
    expect(args).toContain("-t");
    expect(args).toContain("-c");
    expect(args).toContain("copy");
    expect(clampQuickTrim(-10, 9_000, 5_000)).toEqual({ startMs: 0, endMs: 5000 });
    expect(clampQuickTrim(100, 200, 8_000).endMs - clampQuickTrim(100, 200, 8_000).startMs).toBeGreaterThanOrEqual(400);
  });

  it("builds a slow Ken Burns still clip", () => {
    const args = kenBurnsStillArgs("poster.jpg", "out.mp4", 8);
    expect(args.join(" ")).toContain("zoompan=");
    expect(args).toContain("-an");
    expect(args).toContain("yuv420p");
  });

  it("muxes original lesson audio onto illustrated stills", () => {
    const args = illustratedConcatArgs("list.txt", "voice.m4a", "out.mp4");
    expect(args).toContain("concat");
    expect(args).toContain("voice.m4a");
    expect(args).toContain("-shortest");
  });

  it("replaceAudioArgs copies video so mux is cheap", () => {
    const args = replaceAudioArgs("/tmp/v.mp4", "/tmp/a.wav", "/tmp/out.mp4");
    expect(args).toContain("-c:v");
    expect(args).toContain("copy");
    expect(args).toContain("-shortest");
    expect(args).not.toContain("libx264");
  });

  it("eyeContactReframeArgs is a honest crop/zoom, not iris warp", () => {
    const args = eyeContactReframeArgs("/tmp/v.mp4", "/tmp/out.mp4");
    expect(args.some((a) => a.includes("crop="))).toBe(true);
    expect(args).toContain("libx264");
    expect(args.join(" ")).not.toContain("iris");
  });

  it("fitAudioDurationArgs clamps atempo to 0.5–2", () => {
    const args = fitAudioDurationArgs("/tmp/a.mp3", "/tmp/out.m4a", 8, 2.4);
    expect(args.some((a) => a.includes("atempo=2"))).toBe(true);
    expect(args).toContain("8.000");
  });
});

