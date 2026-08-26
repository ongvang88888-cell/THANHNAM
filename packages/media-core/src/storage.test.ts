import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { describe, expect, it } from "vitest";
import { DiskStorageProvider, MemoryStorageProvider, assertSafeStorageKey } from "./index";

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
    expect(storage.localPath("clip.mp4")).toBeNull();
    await expect(
      storage.writeFromStream("big.mp4", Readable.from([Buffer.alloc(8)]), "video/mp4", { maxBytes: 4 }),
    ).rejects.toThrow(/MEDIA_TOO_LARGE/);
  });
});

describe("DiskStorageProvider objects", () => {
  it("persists files on disk and rejects path traversal", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "edu-disk-"));
    const storage = new DiskStorageProvider(root);
    await storage.putObject("app/education_app/videos/clip.mp4", Buffer.from("abcd"), "video/mp4");
    const obj = await storage.getObject("app/education_app/videos/clip.mp4");
    expect(obj?.bytes.toString()).toBe("abcd");
    expect(obj?.contentType).toBe("video/mp4");
    const head = await storage.head("app/education_app/videos/clip.mp4");
    expect(head?.sizeBytes).toBe(4);
    const local = storage.localPath("app/education_app/videos/clip.mp4");
    expect(local.startsWith(root)).toBe(true);
    const streamed = await storage.writeFromStream(
      "app/education_app/videos/stream.mp4",
      Readable.from([Buffer.from("xyz")]),
      "video/mp4",
    );
    expect(streamed).toBe(3);
    expect(assertSafeStorageKey("app/ok.mp4")).toBe("app/ok.mp4");
    expect(() => assertSafeStorageKey("../etc/passwd")).toThrow(/Invalid storage key/);
    await expect(
      storage.writeFromStream(
        "app/education_app/videos/huge.mp4",
        Readable.from([Buffer.alloc(32)]),
        "video/mp4",
        { maxBytes: 16 },
      ),
    ).rejects.toThrow(/MEDIA_TOO_LARGE/);
    expect(await storage.head("app/education_app/videos/huge.mp4")).toBeNull();
    await rm(root, { recursive: true, force: true });
  });
});
