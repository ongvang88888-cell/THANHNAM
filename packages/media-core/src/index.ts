export interface SignedUpload {
  url: string;
  key: string;
  expiresAt: Date;
  headers?: Record<string, string>;
}

export interface SignedDownload {
  url: string;
  expiresAt: Date;
}

export interface IStorageProvider {
  createUploadUrl(input: {
    key: string;
    contentType: string;
    ttlSeconds: number;
  }): Promise<SignedUpload>;
  createDownloadUrl(input: {
    key: string;
    ttlSeconds: number;
  }): Promise<SignedDownload>;
  head(key: string): Promise<{ sizeBytes: number; contentType?: string } | null>;
  delete(key: string): Promise<void>;
}

export interface TranscodePort {
  enqueue(input: {
    videoId: string;
    sourceKey: string;
    outputPrefix: string;
  }): Promise<{ jobId: string }>;
}

const ALLOWED_DOC_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "image/jpeg",
  "image/png",
  "image/webp",
  "audio/mpeg",
  "audio/wav",
  "video/mp4",
]);

export function assertAllowedMime(mime: string): void {
  if (!ALLOWED_DOC_MIME.has(mime)) {
    throw new Error(`MIME not allowed: ${mime}`);
  }
}

export function buildObjectKey(input: {
  appId: string;
  type: string;
  id: string;
  filename: string;
}): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const safe = input.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `app/${input.appId}/${input.type}/${yyyy}/${mm}/${input.id}-${safe}`;
}

/** Local/dev storage that issues pseudo signed URLs (API will proxy in production adapters). */
export class MemoryStorageProvider implements IStorageProvider {
  private objects = new Map<string, { contentType: string; sizeBytes: number }>();

  async createUploadUrl(input: {
    key: string;
    contentType: string;
    ttlSeconds: number;
  }): Promise<SignedUpload> {
    this.objects.set(input.key, { contentType: input.contentType, sizeBytes: 0 });
    const expiresAt = new Date(Date.now() + input.ttlSeconds * 1000);
    return {
      url: `memory://upload/${encodeURIComponent(input.key)}`,
      key: input.key,
      expiresAt,
    };
  }

  async createDownloadUrl(input: {
    key: string;
    ttlSeconds: number;
  }): Promise<SignedDownload> {
    const expiresAt = new Date(Date.now() + input.ttlSeconds * 1000);
    return {
      url: `memory://download/${encodeURIComponent(input.key)}?exp=${expiresAt.getTime()}`,
      expiresAt,
    };
  }

  async head(key: string) {
    return this.objects.get(key) ?? null;
  }

  async delete(key: string) {
    this.objects.delete(key);
  }
}

export class NoopTranscodeAdapter implements TranscodePort {
  async enqueue(input: {
    videoId: string;
    sourceKey: string;
    outputPrefix: string;
  }): Promise<{ jobId: string }> {
    return { jobId: `noop-${input.videoId}` };
  }
}
