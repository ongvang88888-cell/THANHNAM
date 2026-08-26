import { createReadStream, createWriteStream } from "node:fs";
import { copyFile, mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import type { Readable } from "node:stream";
import { MAX_MEDIA_OBJECT_BYTES, MediaTooLargeError, limitBytesTransform } from "./limits";
import { signedLocalMediaUrl } from "./signing";
import type { IStorageProvider, SignedDownload, SignedUpload, StoredObject } from "./types";

export function storageRoot(): string {
  const configured = process.env.STORAGE_ROOT?.trim();
  if (configured) return path.resolve(configured);
  return "/var/lib/edu-commerce/media";
}

export function assertSafeStorageKey(key: string): string {
  const normalized = String(key || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");
  if (!normalized || normalized.includes("\0") || normalized.split("/").includes("..")) {
    throw new Error("Invalid storage key");
  }
  if (normalized.startsWith("/") || /^[a-zA-Z]:/.test(normalized)) {
    throw new Error("Invalid storage key");
  }
  return normalized;
}

function inferContentType(key: string, fallback = "application/octet-stream"): string {
  const ext = path.extname(key).toLowerCase();
  switch (ext) {
    case ".mp4":
      return "video/mp4";
    case ".webm":
      return "video/webm";
    case ".m3u8":
      return "application/vnd.apple.mpegurl";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".vtt":
      return "text/vtt";
    case ".mp3":
      return "audio/mpeg";
    case ".m4a":
      return "audio/mp4";
    case ".pdf":
      return "application/pdf";
    default:
      return fallback;
  }
}

export class DiskStorageProvider implements IStorageProvider {
  constructor(private readonly root = storageRoot()) {}

  localPath(key: string): string {
    return path.join(this.root, assertSafeStorageKey(key));
  }

  private metaPath(filePath: string): string {
    return `${filePath}.meta.json`;
  }

  private async writeMeta(filePath: string, contentType: string): Promise<void> {
    await writeFile(this.metaPath(filePath), JSON.stringify({ contentType }), "utf8");
  }

  private async readContentType(key: string, filePath: string): Promise<string> {
    try {
      const raw = await readFile(this.metaPath(filePath), "utf8");
      const parsed = JSON.parse(raw) as { contentType?: string };
      if (parsed.contentType) return parsed.contentType;
    } catch {
      // fall through to extension
    }
    return inferContentType(key);
  }

  async getObject(key: string): Promise<StoredObject | null> {
    const filePath = this.localPath(key);
    try {
      const bytes = await readFile(filePath);
      if (bytes.length === 0) return null;
      return { bytes, contentType: await this.readContentType(key, filePath) };
    } catch {
      return null;
    }
  }

  async putObject(key: string, bytes: Buffer, contentType: string): Promise<void> {
    if (bytes.length > MAX_MEDIA_OBJECT_BYTES) {
      throw new MediaTooLargeError();
    }
    const filePath = this.localPath(key);
    await mkdir(path.dirname(filePath), { recursive: true });
    const tmp = `${filePath}.part`;
    await writeFile(tmp, bytes);
    await rename(tmp, filePath);
    await this.writeMeta(filePath, contentType);
  }

  async putFile(key: string, filePath: string, contentType: string): Promise<void> {
    const dest = this.localPath(key);
    await mkdir(path.dirname(dest), { recursive: true });
    const tmp = `${dest}.part`;
    await copyFile(filePath, tmp);
    await rename(tmp, dest);
    await this.writeMeta(dest, contentType);
  }

  async writeFromStream(
    key: string,
    stream: Readable,
    contentType: string,
    opts?: { maxBytes?: number },
  ): Promise<number> {
    const dest = this.localPath(key);
    await mkdir(path.dirname(dest), { recursive: true });
    const tmp = `${dest}.part`;
    const maxBytes = opts?.maxBytes ?? MAX_MEDIA_OBJECT_BYTES;
    try {
      await pipeline(stream, limitBytesTransform(maxBytes), createWriteStream(tmp));
      const info = await stat(tmp);
      await rename(tmp, dest);
      await this.writeMeta(dest, contentType);
      return info.size;
    } catch (err) {
      await rm(tmp, { force: true });
      throw err;
    }
  }

  createReadStream(key: string, opts?: { start?: number; end?: number }) {
    return createReadStream(this.localPath(key), opts);
  }

  async createUploadUrl(input: {
    key: string;
    contentType: string;
    ttlSeconds: number;
  }): Promise<SignedUpload> {
    const dest = this.localPath(input.key);
    await mkdir(path.dirname(dest), { recursive: true });
    const signed = signedLocalMediaUrl(input.key, input.ttlSeconds);
    return {
      url: signed.url,
      key: input.key,
      expiresAt: signed.expiresAt,
      headers: { "Content-Type": input.contentType },
    };
  }

  async createDownloadUrl(input: { key: string; ttlSeconds: number }): Promise<SignedDownload> {
    return signedLocalMediaUrl(input.key, input.ttlSeconds);
  }

  async head(key: string) {
    const filePath = this.localPath(key);
    try {
      const info = await stat(filePath);
      if (!info.isFile()) return null;
      return { sizeBytes: info.size, contentType: await this.readContentType(key, filePath) };
    } catch {
      return null;
    }
  }

  async delete(key: string) {
    const filePath = this.localPath(key);
    await rm(filePath, { force: true });
    await rm(this.metaPath(filePath), { force: true });
  }
}

let sharedDiskStorage: DiskStorageProvider | null = null;

export function getSharedDiskStorage(): DiskStorageProvider {
  if (!sharedDiskStorage) sharedDiskStorage = new DiskStorageProvider(storageRoot());
  return sharedDiskStorage;
}
