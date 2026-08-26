import { describe, expect, it } from "vitest";
import { MemoryStorageProvider } from "./index";

describe("MemoryStorageProvider objects", () => {
  it("round-trips getObject and putObject without placeholders", async () => {
    const storage = new MemoryStorageProvider();
    expect(await storage.getObject("missing")).toBeNull();
    await storage.putObject("clip.mp4", Buffer.from("abcd"), "video/mp4");
    const obj = await storage.getObject("clip.mp4");
    expect(obj?.contentType).toBe("video/mp4");
    expect(obj?.bytes.toString()).toBe("abcd");
    const head = await storage.head("clip.mp4");
    expect(head?.sizeBytes).toBe(4);
  });
});
