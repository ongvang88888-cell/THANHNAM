import { describe, expect, it } from "vitest";
import { parseAiEditOptions } from "./options";

describe("parseAiEditOptions", () => {
  it("accepts empty and known fields", () => {
    expect(parseAiEditOptions(undefined)).toEqual({});
    expect(parseAiEditOptions({ seekSeconds: 3.5, prompt: "  poster  " })).toEqual({
      seekSeconds: 3.5,
      prompt: "poster",
    });
    expect(parseAiEditOptions({ region: "pip_br", style: "anime", maxScenes: 6 })).toEqual({
      region: "pip_br",
      style: "anime",
      maxScenes: 6,
    });
  });

  it("rejects unknown or invalid fields", () => {
    expect(() => parseAiEditOptions({ voiceClone: true })).toThrow(/không hợp lệ/);
    expect(() => parseAiEditOptions({ seekSeconds: -1 })).toThrow(/seekSeconds/);
    expect(() => parseAiEditOptions({ region: "center" })).toThrow(/region/);
    expect(() => parseAiEditOptions({ style: "oil" })).toThrow(/style/);
    expect(() => parseAiEditOptions("x")).toThrow(/object/);
  });
});
