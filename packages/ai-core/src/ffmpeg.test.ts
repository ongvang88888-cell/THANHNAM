import { describe, expect, it } from "vitest";
import {
  cartoonPersonGraph,
  courseEnhanceArgs,
  enhanceAndSpeechArgs,
  extractSpeechAudioArgs,
  illustratedConcatArgs,
  pictureEnhanceArgs,
  silenceTrimArgs,
  speechFocusArgs,
  studioSoundArgs,
  thumbnailArgs,
  titlePosterArgs,
  toonTalkingHeadArgs,
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

  it("trims silence with a safe encoder preset", () => {
    const args = silenceTrimArgs("in.mp4", "out.mp4");
    expect(args.some((a) => a.startsWith("silenceremove="))).toBe(true);
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
    expect(args.some((a) => a.includes("highpass=f=140") && a.includes("lowpass=f=3800"))).toBe(true);
    expect(args.slice(args.indexOf("-c:v"), args.indexOf("-c:v") + 2)).toEqual(["-c:v", "copy"]);
  });

  it("cartoons the full person frame with ink lines", () => {
    const graph = cartoonPersonGraph("anime");
    expect(graph).toContain("edgedetect=");
    expect(graph).toContain("blend=all_mode=multiply");
    const full = toonTalkingHeadArgs("in.mp4", "out.mp4", "full", "anime");
    expect(full.join(" ")).toContain("filter_complex");
    expect(full.join(" ")).toContain("edgedetect=");
    expect(full).toContain("-map");
    const pip = toonTalkingHeadArgs("in.mp4", "out.mp4", "pip_br", "anime");
    expect(pip.join(" ")).toContain("overlay=W-w-20:H-h-20");
    expect(pip).toContain("-c:a");
  });

  it("combines slide-safe enhance with speech-focus in one encode", () => {
    const args = enhanceAndSpeechArgs("in.mp4", "out.mp4");
    expect(args.some((a) => a.includes("hqdn3d=") && a.includes("unsharp=3:3"))).toBe(true);
    expect(args.some((a) => a.includes("highpass=f=140") && a.includes("lowpass=f=3800"))).toBe(true);
    expect(args).not.toContain("-c:v");
    expect(args).not.toContain("-c:a");
  });

  it("muxes original lesson audio onto illustrated stills", () => {
    const args = illustratedConcatArgs("list.txt", "voice.m4a", "out.mp4");
    expect(args).toContain("concat");
    expect(args).toContain("voice.m4a");
    expect(args).toContain("-shortest");
  });
});
