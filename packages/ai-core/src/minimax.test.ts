import { describe, expect, it } from "vitest";
import {
  buildMinimaxVideoBody,
  clampMinimaxDuration,
  minimaxApiBase,
  parseMinimaxStatus,
  parseMinimaxTaskId,
} from "./minimax";

describe("minimax", () => {
  it("builds H3 image-to-video content", () => {
    const body = buildMinimaxVideoBody({
      prompt: "A cartoon child talks",
      imageUrl: "https://cdn.hailuoai.com/still.png",
      durationSec: 6,
    });
    expect(body.model).toBe("MiniMax-H3");
    expect(body.duration).toBe(6);
    expect(body.resolution).toBe("768P");
    expect(body.content[0]).toEqual({ type: "text", text: "A cartoon child talks" });
    expect(body.content[1]).toMatchObject({ type: "image_url", role: "first_frame" });
    expect(body.ratio).toBeUndefined();
  });

  it("requires ratio for text-only video", () => {
    const body = buildMinimaxVideoBody({ prompt: "Classroom intro" });
    expect(body.ratio).toBe("16:9");
    expect(clampMinimaxDuration(99)).toBe(15);
    expect(clampMinimaxDuration(2)).toBe(4);
  });

  it("parses task id and succeeded url", () => {
    expect(parseMinimaxTaskId({ task_id: "t1" })).toBe("t1");
    const done = parseMinimaxStatus({
      task: { status: "succeeded", content: { url: "https://filecdn.minimax.chat/out.mp4" } },
    });
    expect(done.status).toBe("completed");
    expect(done.videoUrl).toBe("https://filecdn.minimax.chat/out.mp4");
    expect(parseMinimaxStatus({ task: { status: "failed", error: "quota" } }).error).toBe("quota");
    expect(parseMinimaxStatus({ task: { status: "succeeded", content: { url: "https://evil.example/x" } } }).error).toMatch(
      /không hợp lệ/,
    );
  });

  it("pins the official API host", () => {
    const prev = process.env.MINIMAX_API_BASE;
    process.env.MINIMAX_API_BASE = "http://evil.example";
    expect(minimaxApiBase()).toBe("https://api.minimax.io");
    process.env.MINIMAX_API_BASE = "https://api.minimax.chat";
    expect(minimaxApiBase()).toBe("https://api.minimax.chat");
    if (prev === undefined) delete process.env.MINIMAX_API_BASE;
    else process.env.MINIMAX_API_BASE = prev;
  });
});
