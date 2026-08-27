import { afterEach, describe, expect, it } from "vitest";
import {
  WAN_CHUNK_SEC,
  WAN_MISSING_KEY,
  falApiKey,
  falQueueUrl,
  parseDashscopeTask,
  parseDashscopeTaskId,
  parseFalQueueStatus,
  parseFalQueueSubmit,
  parseFalReplaceResult,
  parseFalUploadInitiate,
  planWanChunks,
  wanProviderFromEnv,
  wanReplaceCharacter,
} from "./wan";

describe("wan 2.2 replace", () => {
  const prevFal = process.env.FAL_KEY;
  const prevFalAlias = process.env.FAL_API_KEY;
  const prevDash = process.env.DASHSCOPE_API_KEY;
  const prevDashAlias = process.env.DASHSCOPE_KEY;

  afterEach(() => {
    if (prevFal === undefined) delete process.env.FAL_KEY;
    else process.env.FAL_KEY = prevFal;
    if (prevFalAlias === undefined) delete process.env.FAL_API_KEY;
    else process.env.FAL_API_KEY = prevFalAlias;
    if (prevDash === undefined) delete process.env.DASHSCOPE_API_KEY;
    else process.env.DASHSCOPE_API_KEY = prevDash;
    if (prevDashAlias === undefined) delete process.env.DASHSCOPE_KEY;
    else process.env.DASHSCOPE_KEY = prevDashAlias;
  });

  it("splits lectures into Wan-sized chunks", () => {
    expect(planWanChunks(20)).toEqual([{ startSec: 0, durationSec: 20 }]);
    expect(planWanChunks(45)).toEqual([
      { startSec: 0, durationSec: 20 },
      { startSec: 20, durationSec: 20 },
      { startSec: 40, durationSec: 5 },
    ]);
    expect(planWanChunks(21.5)).toEqual([{ startSec: 0, durationSec: 21.5 }]);
    expect(planWanChunks(40).every((chunk) => chunk.durationSec <= 28)).toBe(true);
    expect(planWanChunks(40).every((chunk) => chunk.durationSec >= 2)).toBe(true);
    expect(() => planWanChunks(1)).toThrow(/quá ngắn/);
    expect(WAN_CHUNK_SEC).toBe(20);
  });

  it("prefers Fal then DashScope", () => {
    delete process.env.FAL_KEY;
    delete process.env.FAL_API_KEY;
    delete process.env.DASHSCOPE_API_KEY;
    delete process.env.DASHSCOPE_KEY;
    expect(wanProviderFromEnv()).toBeNull();
    process.env.DASHSCOPE_API_KEY = "dash";
    expect(wanProviderFromEnv()).toBe("dashscope");
    process.env.FAL_KEY = "fal";
    expect(wanProviderFromEnv()).toBe("fal");
    expect(falQueueUrl()).toContain("wan/v2.2-14b/animate/replace");
  });

  it("reads common key aliases", () => {
    delete process.env.FAL_KEY;
    delete process.env.DASHSCOPE_API_KEY;
    process.env.FAL_API_KEY = "fal-alias";
    expect(falApiKey()).toBe("fal-alias");
    expect(wanProviderFromEnv()).toBe("fal");
    delete process.env.FAL_API_KEY;
    process.env.DASHSCOPE_KEY = "dash-alias";
    expect(wanProviderFromEnv()).toBe("dashscope");
  });

  it("parses Fal and DashScope envelopes", () => {
    expect(parseFalQueueSubmit({ request_id: "req_1" })).toEqual({ requestId: "req_1" });
    expect(parseFalQueueStatus({ status: "IN_PROGRESS" })).toBe("running");
    expect(parseFalQueueStatus({ status: "COMPLETED" })).toBe("done");
    expect(parseFalReplaceResult({ video: { url: "https://v3.fal.media/files/out.mp4" } })).toBe(
      "https://v3.fal.media/files/out.mp4",
    );
    expect(parseFalUploadInitiate({ upload_url: "https://upload.fal.ai/x", file_url: "https://v3.fal.media/a.mp4" })).toEqual({
      uploadUrl: "https://upload.fal.ai/x",
      fileUrl: "https://v3.fal.media/a.mp4",
    });
    expect(parseDashscopeTaskId({ output: { task_id: "t1" } })).toBe("t1");
    expect(parseDashscopeTask({ output: { task_status: "SUCCEEDED", video_url: "https://cdn.aliyuncs.com/a.mp4" } })).toEqual({
      status: "done",
      videoUrl: "https://cdn.aliyuncs.com/a.mp4",
    });
  });

  it("runs Fal queue submit then result", async () => {
    process.env.FAL_KEY = "fal-test";
    delete process.env.DASHSCOPE_API_KEY;
    const calls: string[] = [];
    const result = await wanReplaceCharacter({
      videoUrl: "https://cdn.example/v.mp4",
      imageUrl: "https://cdn.example/a.png",
      sleep: async () => undefined,
      fetchImpl: async (url) => {
        const href = String(url);
        calls.push(href);
        if (href.includes("/status")) {
          return new Response(JSON.stringify({ status: "COMPLETED" }), { status: 200 });
        }
        if (href.includes("/requests/")) {
          return new Response(JSON.stringify({ video: { url: "https://v3.fal.media/out.mp4" } }), { status: 200 });
        }
        return new Response(JSON.stringify({ request_id: "req_9" }), { status: 200 });
      },
    });
    expect(result.provider).toBe("fal");
    expect(result.videoUrl).toBe("https://v3.fal.media/out.mp4");
    expect(calls[0]).toContain("queue.fal.run");
  });

  it("refuses to invent a local replace without keys", async () => {
    delete process.env.FAL_KEY;
    delete process.env.DASHSCOPE_API_KEY;
    await expect(
      wanReplaceCharacter({ videoUrl: "https://cdn.example/v.mp4", imageUrl: "https://cdn.example/a.png" }),
    ).rejects.toThrow(WAN_MISSING_KEY);
  });
});
