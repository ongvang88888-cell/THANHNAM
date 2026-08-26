import { describe, expect, it } from "vitest";
import {
  characterStillPrompt,
  defaultInsertMode,
  hailuoMotionPrompt,
  overlayRegionForInsert,
  veoIntroPrompt,
} from "./character";

describe("character insert helpers", () => {
  it("defaults overlay for talking inserts and intro for Veo", () => {
    expect(defaultInsertMode("avatar_presenter")).toBe("overlay");
    expect(defaultInsertMode("hailuo_character")).toBe("overlay");
    expect(defaultInsertMode("veo_intro")).toBe("intro");
    expect(overlayRegionForInsert("speaker")).toBe("pip_br");
    expect(overlayRegionForInsert("pip_tl")).toBe("pip_tl");
  });

  it("builds honest still and motion prompts", () => {
    expect(characterStillPrompt("cartoon_kid", "Toán lớp 1")).toMatch(/Pixar-like/);
    expect(characterStillPrompt("teacher", "Toán lớp 1")).toMatch(/ao dai/i);
    expect(hailuoMotionPrompt("cartoon_kid", "Xin chào")).toMatch(/Xin chào/);
    expect(veoIntroPrompt("teacher", "Hình học", "Chào lớp")).toMatch(/8-second/);
    expect(veoIntroPrompt("teacher", "Hình học", "Chào lớp")).toMatch(/Chào lớp/);
  });
});
