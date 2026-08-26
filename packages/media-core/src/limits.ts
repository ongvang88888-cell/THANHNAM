import { statfs } from "node:fs/promises";
import { Transform } from "node:stream";

export const MAX_MEDIA_OBJECT_BYTES = 400 * 1024 * 1024;
export const MIN_FREE_MEDIA_BYTES = 2 * 1024 * 1024 * 1024;

export class MediaTooLargeError extends Error {
  readonly maxBytes: number;
  constructor(maxBytes = MAX_MEDIA_OBJECT_BYTES) {
    super(`MEDIA_TOO_LARGE:${maxBytes}`);
    this.name = "MediaTooLargeError";
    this.maxBytes = maxBytes;
  }
}

export function isMediaTooLargeError(err: unknown): err is MediaTooLargeError {
  return err instanceof MediaTooLargeError || (err instanceof Error && err.message.startsWith("MEDIA_TOO_LARGE:"));
}

export function limitBytesTransform(maxBytes: number): Transform {
  let seen = 0;
  return new Transform({
    transform(chunk, _enc, cb) {
      const size = Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk);
      seen += size;
      if (seen > maxBytes) {
        cb(new MediaTooLargeError(maxBytes));
        return;
      }
      cb(null, chunk);
    },
  });
}

export async function freeDiskBytes(root: string): Promise<number | null> {
  try {
    const info = await statfs(root);
    return Number(info.bavail) * Number(info.bsize);
  } catch {
    return null;
  }
}

export async function assertFreeMediaDisk(root: string, needBytes = MIN_FREE_MEDIA_BYTES): Promise<void> {
  const free = await freeDiskBytes(root);
  if (free !== null && free < needBytes) {
    throw new Error("MEDIA_DISK_FULL");
  }
}
