import { describe, expect, it } from "vitest";
import {
  characterReadyForAutoReplace,
  defaultCharacterBible,
  describeCharacterGap,
  emptyPresenterCharacter,
  isReusablePresenterId,
  lockedHailuoMotionPrompt,
  parsePresenterCharacterInput,
  presentPresenterCharacter,
  presenterGreeting,
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

  it("is ready only with consents plus a reusable id or still", () => {
    expect(
      characterReadyForAutoReplace({
        autoReplace: true,
        confirmOwned: true,
        confirmLikeness: true,
        heygenAvatarId: "look_abc1",
      }),
    ).toBe(true);
    expect(
      characterReadyForAutoReplace({
        autoReplace: true,
        confirmOwned: true,
        confirmLikeness: true,
        stillUrl: "https://cdn.example/face.png",
      }),
    ).toBe(true);
    expect(
      characterReadyForAutoReplace({
        autoReplace: true,
        confirmOwned: true,
        confirmLikeness: false,
        stillUrl: "https://cdn.example/face.png",
      }),
    ).toBe(false);
  });

  it("explains the next missing piece in Vietnamese", () => {
    expect(
      describeCharacterGap(
        { autoReplace: true, confirmOwned: false, confirmLikeness: false },
        { heygen: true, minimax: false },
      ),
    ).toMatch(/xác nhận/i);
    expect(
      describeCharacterGap(
        { autoReplace: true, confirmOwned: true, confirmLikeness: true, stillUrl: "https://cdn.example/a.png" },
        { heygen: false, minimax: false },
      ),
    ).toMatch(/HEYGEN_API_KEY/);
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
    expect(emptyPresenterCharacter({ heygen: false, minimax: false }).ready).toBe(false);
    expect(presenterGreeting("Cô Minh", "teacher")).toMatch(/Cô Minh/);
  });
});
