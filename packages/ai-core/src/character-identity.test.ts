import { describe, expect, it } from "vitest";
import {
  characterReadyForAutoReplace,
  defaultAutoPresenter,
  defaultCharacterBible,
  describeCharacterGap,
  emptyPresenterCharacter,
  isReusablePresenterId,
  lockedHailuoMotionPrompt,
  parsePresenterCharacterInput,
  presentPresenterCharacter,
  presenterGreeting,
  resolveAutoPresenter,
  shouldAutoInsertPresenter,
} from "./character-identity";

describe("character identity", () => {
  it("locks a detailed bible per look", () => {
    expect(defaultCharacterBible("teacher", "Cô Minh")).toMatch(/photoreal Vietnamese female teacher/i);
    expect(defaultCharacterBible("cartoon_kid", "Bé An")).toMatch(/Pixar-like/i);
    expect(defaultCharacterBible("custom", "Lan")).toMatch(/exact face/i);
  });

  it("keeps Hailuo on the first-frame identity", () => {
    const prompt = lockedHailuoMotionPrompt("teacher", "Same face every shot.", "Xin chào");
    expect(prompt).toMatch(/EXACT same person/i);
    expect(prompt).toMatch(/Same face every shot/);
  });

  it("accepts reusable HeyGen look ids", () => {
    expect(isReusablePresenterId("look_abc123")).toBe(true);
    expect(isReusablePresenterId("tp_9")).toBe(true);
    expect(isReusablePresenterId("ab")).toBe(false);
    expect(isReusablePresenterId("bad id")).toBe(false);
  });

  it("auto-inserts a presenter on every upload unless turned off", () => {
    expect(shouldAutoInsertPresenter(null)).toBe(true);
    expect(characterReadyForAutoReplace({ autoReplace: true, confirmOwned: false, confirmLikeness: false })).toBe(true);
    expect(
      characterReadyForAutoReplace({
        autoReplace: false,
        confirmOwned: true,
        confirmLikeness: true,
        heygenAvatarId: "look_abc1",
      }),
    ).toBe(false);
    const saved = resolveAutoPresenter({
      id: "p1",
      name: "Lan",
      look: "custom",
      bible: "Same face.",
      stillUrl: "https://cdn.example/a.png",
      heygenAvatarId: null,
      heygenTalkingPhotoId: null,
      autoReplace: true,
      confirmOwned: true,
      confirmLikeness: true,
    });
    expect(saved?.name).toBe("Lan");
    expect(resolveAutoPresenter(null)?.name).toBe(defaultAutoPresenter().name);
    expect(
      resolveAutoPresenter({
        name: "Lan",
        look: "teacher",
        bible: "x",
        autoReplace: false,
        confirmOwned: true,
        confirmLikeness: true,
      }),
    ).toBeNull();
  });

  it("explains the next missing piece in Vietnamese", () => {
    expect(
      describeCharacterGap(
        { autoReplace: true, confirmOwned: false, confirmLikeness: false },
        { heygen: true, minimax: false },
      ),
    ).toMatch(/mặc định/i);
    expect(
      describeCharacterGap(
        { autoReplace: true, confirmOwned: true, confirmLikeness: true, stillUrl: "https://cdn.example/a.png" },
        { heygen: false, minimax: false },
      ),
    ).toMatch(/thẻ nhân vật trên máy/i);
  });

  it("parses a save payload and fills a missing bible", () => {
    const parsed = parsePresenterCharacterInput({
      name: "  Cô Minh  ",
      look: "teacher",
      confirmOwned: true,
      confirmLikeness: true,
    });
    expect(parsed.name).toBe("Cô Minh");
    expect(parsed.bible).toMatch(/Cô Minh/);
    expect(parsed.autoReplace).toBe(true);
    expect(() => parsePresenterCharacterInput({ name: "A", look: "teacher", confirmOwned: true, confirmLikeness: true })).toThrow(
      /tối thiểu/,
    );
    expect(() =>
      parsePresenterCharacterInput({
        name: "Lan",
        look: "teacher",
        stillUrl: "http://insecure.local/a.png",
        confirmOwned: true,
        confirmLikeness: true,
      }),
    ).toThrow(/https/i);
  });

  it("presents a public view without raw ids", () => {
    const view = presentPresenterCharacter(
      {
        name: "Cô Minh",
        look: "teacher",
        bible: "Same face.",
        stillUrl: "https://cdn.example/a.png",
        autoReplace: true,
        confirmOwned: true,
        confirmLikeness: true,
        heygenAvatarId: "look_abc1",
      },
      { heygen: true, minimax: false },
    );
    expect(view.ready).toBe(true);
    expect(view.hasHeygenAvatar).toBe(true);
    expect(view.gap).toMatch(/đủ để tự che người/);
    expect(emptyPresenterCharacter({ heygen: false, minimax: false }).ready).toBe(true);
    expect(presenterGreeting("Cô Minh", "teacher")).toMatch(/Cô Minh/);
  });
});
