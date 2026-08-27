import { describe, expect, it } from "vitest";
import {
  buildHeygenAvatarBody,
  buildHeygenCreateAvatarBody,
  buildHeygenTranslateBody,
  isAllowedHeygenMediaUrl,
  parseHeygenAvatarCreate,
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
    const look = buildHeygenAvatarBody({
      script: "Xin chào lớp.",
      title: "Bài 1",
      avatarId: "look_abc1",
    });
    expect(look.video_inputs[0]?.character).toEqual({
      type: "avatar",
      avatar_id: "look_abc1",
      avatar_style: "normal",
    });
    const preferPhoto = buildHeygenAvatarBody({
      script: "Xin chào lớp.",
      title: "Bài 1",
      talkingPhotoId: "tp_1",
      avatarId: "look_abc1",
    });
    expect(preferPhoto.video_inputs[0]?.character.type).toBe("talking_photo");
  });

  it("builds HeyGen v3 create-avatar bodies", () => {
    expect(
      buildHeygenCreateAvatarBody({
        type: "photo",
        name: "Cô Minh",
        stillUrl: "https://cdn.example/face.png",
      }),
    ).toEqual({
      type: "photo",
      name: "Cô Minh",
      file: { type: "url", url: "https://cdn.example/face.png" },
    });
    const prompt = buildHeygenCreateAvatarBody({
      type: "prompt",
      name: "Cô Minh",
      prompt: "Same photoreal teacher in a red ao dai.",
      avatarId: "look_abc1",
    });
    expect(prompt.type).toBe("prompt");
    if (prompt.type === "prompt") {
      expect(prompt.avatar_id).toBe("look_abc1");
      expect(prompt.prompt).toMatch(/red ao dai/);
    }
    expect(() => buildHeygenCreateAvatarBody({ type: "photo", name: "X" })).toThrow(/https/);
  });

  it("parses HeyGen v3 avatar_item.id from several envelopes", () => {
    expect(
      parseHeygenAvatarCreate({
        data: {
          avatar_item: { id: "look_abc1", default_voice_id: "voice_1" },
          avatar_group: { id: "group_xyz1" },
        },
      }),
    ).toEqual({
      avatarId: "look_abc1",
      groupId: "group_xyz1",
      voiceId: "voice_1",
      status: null,
    });
    expect(parseHeygenAvatarCreate({ avatar_id: "look_def2" }).avatarId).toBe("look_def2");
    expect(() => parseHeygenAvatarCreate({})).toThrow(/avatar_item.id/);
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
