import { describe, expect, it } from "vitest";
import {
  AI_EDIT_TOOLS,
  PUBLIC_AI_EDIT_TOOL_IDS,
  envAiCapabilities,
  getAiEditTool,
  isAiEditToolId,
  isPublicAiEditToolId,
  toolAvailability,
} from "./catalog";

const BASE_CAPS = {
  enabled: true,
  ffmpeg: true,
  speech: false,
  imageGen: false,
  llm: false,
  tts: false,
  heygen: false,
  minimax: false,
  veo: false,
  elevenlabs: false,
  fal: false,
  dashscope: false,
  nanoBanana: false,
  wan: false,
};

describe("AI edit catalog", () => {
  it("keeps historical ids but only publishes Wan replace", () => {
    expect(isAiEditToolId("owned_abc")).toBe(true);
    expect(isAiEditToolId("toon_talking_head")).toBe(true);
    expect(isPublicAiEditToolId("owned_abc")).toBe(true);
    expect(isPublicAiEditToolId("toon_talking_head")).toBe(false);
    expect(PUBLIC_AI_EDIT_TOOL_IDS).toEqual(["owned_abc"]);
    expect(getAiEditTool("owned_abc")?.label).toMatch(/Wan 2\.2/);
    expect(getAiEditTool("owned_abc")?.description).toMatch(/Nano Banana/);
    expect(getAiEditTool("owned_abc")?.description).toMatch(/không Ken Burns/);
    expect(AI_EDIT_TOOLS.some((tool) => tool.id === "owned_abc")).toBe(true);
  });

  it("rejects unknown tools", () => {
    expect(isAiEditToolId("runway_inpaint")).toBe(false);
  });

  it("blocks Wan replace without ffmpeg or Wan keys", () => {
    const tool = getAiEditTool("owned_abc")!;
    expect(toolAvailability(tool, { ...BASE_CAPS, ffmpeg: false }, true).available).toBe(false);
    expect(toolAvailability(tool, BASE_CAPS, true).available).toBe(false);
    expect(toolAvailability(tool, BASE_CAPS, true).note).toMatch(/FAL_KEY|DASHSCOPE/);
    const ready = toolAvailability(tool, { ...BASE_CAPS, wan: true, fal: true }, true);
    expect(ready.available).toBe(true);
    expect(ready.mode).toBe("fallback");
    expect(ready.note).toMatch(/ảnh nhân vật|GEMINI/i);
  });

  it("retires the old researched editor tools", () => {
    const toon = getAiEditTool("toon_talking_head")!;
    expect(toolAvailability(toon, { ...BASE_CAPS, ffmpeg: true }, true).available).toBe(false);
    expect(toolAvailability(toon, { ...BASE_CAPS, ffmpeg: true }, true).note).toMatch(/đã gỡ/);
    expect(toolAvailability(getAiEditTool("avatar_presenter")!, BASE_CAPS, true).available).toBe(false);
  });

  it("honors AI_EDIT_ENABLED=false", () => {
    const prev = process.env.AI_EDIT_ENABLED;
    process.env.AI_EDIT_ENABLED = "false";
    try {
      const caps = envAiCapabilities(true);
      expect(caps.enabled).toBe(false);
      expect(toolAvailability(getAiEditTool("owned_abc")!, caps, true).available).toBe(false);
    } finally {
      if (prev === undefined) delete process.env.AI_EDIT_ENABLED;
      else process.env.AI_EDIT_ENABLED = prev;
    }
  });

  it("detects Wan and Nano Banana keys", () => {
    const prevFal = process.env.FAL_KEY;
    const prevFalAlias = process.env.FAL_API_KEY;
    const prevGemini = process.env.GEMINI_API_KEY;
    process.env.FAL_KEY = "fal-test";
    process.env.GEMINI_API_KEY = "gemini-test";
    try {
      const caps = envAiCapabilities(true);
      expect(caps.fal).toBe(true);
      expect(caps.wan).toBe(true);
      expect(caps.nanoBanana).toBe(true);
      expect(caps.imageGen).toBe(true);
    } finally {
      if (prevFal === undefined) delete process.env.FAL_KEY;
      else process.env.FAL_KEY = prevFal;
      if (prevGemini === undefined) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = prevGemini;
    }
    delete process.env.FAL_KEY;
    process.env.FAL_API_KEY = "fal-alias";
    try {
      expect(envAiCapabilities(true).wan).toBe(true);
    } finally {
      if (prevFalAlias === undefined) delete process.env.FAL_API_KEY;
      else process.env.FAL_API_KEY = prevFalAlias;
      if (prevFal === undefined) delete process.env.FAL_KEY;
      else process.env.FAL_KEY = prevFal;
    }
  });
});
