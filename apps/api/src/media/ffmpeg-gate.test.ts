import { afterEach, describe, expect, it } from "vitest";
import { ResourceGate, ffmpegMaxConcurrent, isHeavyFfmpegEncode } from "./ffmpeg-gate";

const original = process.env.FFMPEG_MAX_CONCURRENT;

afterEach(() => {
  if (original === undefined) delete process.env.FFMPEG_MAX_CONCURRENT;
  else process.env.FFMPEG_MAX_CONCURRENT = original;
});

describe("ffmpeg encode gate", () => {
  it("defaults to two concurrent encodes on a 4-CPU VPS", () => {
    delete process.env.FFMPEG_MAX_CONCURRENT;
    expect(ffmpegMaxConcurrent()).toBe(2);
  });

  it("lets a waiter proceed after a slot is released", async () => {
    process.env.FFMPEG_MAX_CONCURRENT = "1";
    const gate = new ResourceGate(ffmpegMaxConcurrent);
    await gate.acquire();
    let released = false;
    const waiting = gate.acquire().then(() => {
      released = true;
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(released).toBe(false);
    gate.release();
    await waiting;
    expect(released).toBe(true);
    expect(gate.inUse).toBe(1);
    gate.release();
    expect(gate.inUse).toBe(0);
  });

  it("treats lecture encode as heavy and stream-copy trim as light", () => {
    expect(isHeavyFfmpegEncode(["-af", "loudnorm=I=-16", "libx264"])).toBe(true);
    expect(isHeavyFfmpegEncode(["-c", "copy", "-movflags", "+faststart"])).toBe(false);
    expect(isHeavyFfmpegEncode(["-frames:v", "1", "-q:v", "3"])).toBe(false);
  });
});
