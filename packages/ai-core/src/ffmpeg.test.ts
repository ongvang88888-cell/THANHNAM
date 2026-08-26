import { describe, expect, it } from "vitest";
import {
  extractSpeechAudioArgs,
  pictureEnhanceArgs,
  silenceTrimArgs,
  studioSoundArgs,
  thumbnailArgs,
  titlePosterArgs,
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
});
