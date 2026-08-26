import { describe, expect, it } from "vitest";
import {
  buildHeygenAvatarBody,
  buildHeygenTranslateBody,
  isAllowedHeygenMediaUrl,
  parseHeygenStatus,
  parseHeygenTalkingPhotoId,
  parseHeygenVideoId,
} from "./heygen";

describe("heygen", () => {
  it("avatar generate body uses talking photo + voice", () => {
    const body = buildHeygenAvatarBody({
      script: "Xin chào lớp.",
      title: "Bài 1",
    });
    expect(body.video_inputs[0]?.character.type).toBe("avatar");
    if (body.video_inputs[0]?.character.type === "avatar") {
      expect(body.video_inputs[0].character.avatar_id).toBeTruthy();
    }
    expect(body.video_inputs[0]?.voice.input_text).toBe("Xin chào lớp.");
    expect(body.video_inputs[0]?.voice.voice_id).toBeTruthy();
    expect(body.title).toBe("Bài 1");
    const photo = buildHeygenAvatarBody({
      script: "Xin chào lớp.",
      title: "Bài 1",
      talkingPhotoId: "tp_1",
    });
    expect(photo.video_inputs[0]?.character).toEqual({ type: "talking_photo", talking_photo_id: "tp_1" });
    expect(parseHeygenTalkingPhotoId({ data: { talking_photo_id: "tp_9" } })).toBe("tp_9");
  });

  it("translate body requires https source", () => {
    expect(() =>
      buildHeygenTranslateBody({ videoUrl: "http://insecure.local/v.mp4", title: "t", targetLanguage: "en" }),
    ).toThrow(/https/i);
    const body = buildHeygenTranslateBody({
      videoUrl: "https://cdn.example/v.mp4",
      title: "Lesson",
      targetLanguage: "en",
    });
    expect(body.video_url).toBe("https://cdn.example/v.mp4");
    expect(body.output_language).toBe("English");
  });

  it("parseHeygenVideoId reads common envelopes", () => {
    expect(parseHeygenVideoId({ data: { video_id: "vid_1" } })).toBe("vid_1");
    expect(parseHeygenVideoId({ video_id: "vid_2" })).toBe("vid_2");
    expect(() => parseHeygenVideoId({})).toThrow(/video_id/);
  });

  it("parseHeygenStatus maps completed + url", () => {
    const done = parseHeygenStatus({
      data: { status: "completed", video_url: "https://cdn.heygen.com/out.mp4" },
    });
    expect(done.status).toBe("completed");
    expect(done.videoUrl).toBe("https://cdn.heygen.com/out.mp4");
    expect(parseHeygenStatus({ data: { status: "failed", error: "bad" } }).error).toBe("bad");
  });

  it("allows only HeyGen https media hosts", () => {
    expect(isAllowedHeygenMediaUrl("https://files2.heygen.com/out.mp4")).toBe(true);
    expect(isAllowedHeygenMediaUrl("https://cdn.heygen.ai/out.mp4")).toBe(true);
    expect(isAllowedHeygenMediaUrl("https://127.0.0.1/out.mp4")).toBe(false);
    expect(isAllowedHeygenMediaUrl("http://files2.heygen.com/out.mp4")).toBe(false);
    expect(isAllowedHeygenMediaUrl("https://evil.example/out.mp4")).toBe(false);
  });
});
