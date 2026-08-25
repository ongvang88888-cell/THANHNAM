import { createHmac, createHash } from "node:crypto";

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

/** Local/dev in-memory object store with HTTP-reachable signed-style URLs. */
export class MemoryStorageProvider implements IStorageProvider {
  private objects = new Map<string, { contentType: string; bytes: Buffer }>();

  private publicBase(): string {
    const base =
      process.env.MEDIA_PUBLIC_BASE ||
      process.env.API_URL ||
      `http://127.0.0.1:${process.env.API_PORT || 3001}`;
    return `${base.replace(/\/$/, "")}/api/v1/media/local`;
  }

  put(key: string, bytes: Buffer, contentType = "application/octet-stream") {
    this.objects.set(key, { contentType, bytes });
  }

  get(key: string) {
    return this.objects.get(key) ?? null;
  }

  async createUploadUrl(input: {
    key: string;
    contentType: string;
    ttlSeconds: number;
  }): Promise<SignedUpload> {
    if (!this.objects.has(input.key)) {
      this.objects.set(input.key, { contentType: input.contentType, bytes: Buffer.alloc(0) });
    }
    const expiresAt = new Date(Date.now() + input.ttlSeconds * 1000);
    return {
      url: `${this.publicBase()}?key=${encodeURIComponent(input.key)}`,
      key: input.key,
      expiresAt,
      headers: { "Content-Type": input.contentType },
    };
  }

  async createDownloadUrl(input: {
    key: string;
    ttlSeconds: number;
  }): Promise<SignedDownload> {
    const expiresAt = new Date(Date.now() + input.ttlSeconds * 1000);
    if (!this.objects.has(input.key)) {
      // Seed / demo keys may exist only in DB — materialize a tiny placeholder.
      this.put(
        input.key,
        Buffer.from(`edu-commerce placeholder for ${input.key}\n`),
        input.key.endsWith(".pdf") ? "application/pdf" : "video/mp4",
      );
    }
    return {
      url: `${this.publicBase()}?key=${encodeURIComponent(input.key)}&exp=${expiresAt.getTime()}`,
      expiresAt,
    };
  }

  async head(key: string) {
    const obj = this.objects.get(key);
    if (!obj) return null;
    return { sizeBytes: obj.bytes.length, contentType: obj.contentType };
  }

  async delete(key: string) {
    this.objects.delete(key);
  }
}

let sharedMemoryStorage: MemoryStorageProvider | null = null;

export function getSharedMemoryStorage(): MemoryStorageProvider {
  if (!sharedMemoryStorage) sharedMemoryStorage = new MemoryStorageProvider();
  return sharedMemoryStorage;
}

/**
 * S3-compatible signed URL provider (AWS S3 / MinIO).
 * Uses SigV4 query auth without requiring AWS SDK at runtime for URL minting.
 */
export class S3CompatibleStorageProvider implements IStorageProvider {
  constructor(
    private readonly cfg: {
      endpoint: string;
      region: string;
      accessKey: string;
      secretKey: string;
      bucket: string;
      forcePathStyle?: boolean;
    },
  ) {}

  private hostPath(key: string): { host: string; path: string; canonicalUri: string } {
    const endpoint = this.cfg.endpoint.replace(/\/$/, "");
    const url = new URL(endpoint);
    if (this.cfg.forcePathStyle !== false) {
      return {
        host: url.host,
        path: `/${this.cfg.bucket}/${key}`,
        canonicalUri: `/${this.cfg.bucket}/${key.split("/").map(encodeURIComponent).join("/")}`,
      };
    }
    return {
      host: `${this.cfg.bucket}.${url.host}`,
      path: `/${key}`,
      canonicalUri: `/${key.split("/").map(encodeURIComponent).join("/")}`,
    };
  }

  private sign(method: string, key: string, ttlSeconds: number, contentType?: string) {
    const { host, path, canonicalUri } = this.hostPath(key);
    const now = new Date();
    const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const dateStamp = amzDate.slice(0, 8);
    const credentialScope = `${dateStamp}/${this.cfg.region}/s3/aws4_request`;
    const credential = `${this.cfg.accessKey}/${credentialScope}`;
    const expires = String(ttlSeconds);
    const query: Record<string, string> = {
      "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
      "X-Amz-Credential": credential,
      "X-Amz-Date": amzDate,
      "X-Amz-Expires": expires,
      "X-Amz-SignedHeaders": contentType ? "content-type;host" : "host",
    };
    const canonicalQuery = Object.keys(query)
      .sort()
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(query[k]!)}`)
      .join("&");
    const canonicalHeaders = contentType
      ? `content-type:${contentType}\nhost:${host}\n`
      : `host:${host}\n`;
    const signedHeaders = contentType ? "content-type;host" : "host";
    const payloadHash = "UNSIGNED-PAYLOAD";
    const canonicalRequest = [
      method,
      canonicalUri,
      canonicalQuery,
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join("\n");
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      credentialScope,
      createHash("sha256").update(canonicalRequest).digest("hex"),
    ].join("\n");
    const kDate = createHmac("sha256", `AWS4${this.cfg.secretKey}`).update(dateStamp).digest();
    const kRegion = createHmac("sha256", kDate).update(this.cfg.region).digest();
    const kService = createHmac("sha256", kRegion).update("s3").digest();
    const kSigning = createHmac("sha256", kService).update("aws4_request").digest();
    const signature = createHmac("sha256", kSigning).update(stringToSign).digest("hex");
    const endpoint = this.cfg.endpoint.replace(/\/$/, "");
    const url = `${endpoint.startsWith("http") ? "" : "https://"}${endpoint.includes("://") ? endpoint : `https://${endpoint}`}${path}?${canonicalQuery}&X-Amz-Signature=${signature}`;
    // Fix double protocol if endpoint already has scheme
    const finalUrl = url.replace(/^https?:\/\/https?:\/\//, (m) => m.slice(0, m.indexOf("://", 8) >= 0 ? 0 : m.length) || url);
    const cleanUrl = this.cfg.endpoint.includes("://")
      ? `${this.cfg.endpoint.replace(/\/$/, "")}${path}?${canonicalQuery}&X-Amz-Signature=${signature}`
      : url;
    return {
      url: cleanUrl,
      expiresAt: new Date(Date.now() + ttlSeconds * 1000),
      headers: contentType ? { "Content-Type": contentType } : undefined,
    };
  }

  async createUploadUrl(input: {
    key: string;
    contentType: string;
    ttlSeconds: number;
  }): Promise<SignedUpload> {
    const signed = this.sign("PUT", input.key, input.ttlSeconds, input.contentType);
    return { ...signed, key: input.key };
  }

  async createDownloadUrl(input: {
    key: string;
    ttlSeconds: number;
  }): Promise<SignedDownload> {
    return this.sign("GET", input.key, input.ttlSeconds);
  }

  async head(_key: string) {
    return null;
  }

  async delete(_key: string) {
    // Production: issue DeleteObject via SDK/CLI; omitted in lightweight signer.
  }
}

export function createStorageFromEnv(): IStorageProvider {
  // Explicit local memory mode (stable for cloud agents without MinIO)
  if (process.env.STORAGE_DRIVER === "memory") {
    return getSharedMemoryStorage();
  }
  const endpoint = process.env.S3_ENDPOINT;
  const accessKey = process.env.S3_ACCESS_KEY;
  const secretKey = process.env.S3_SECRET_KEY;
  const bucket = process.env.S3_BUCKET_PRIVATE || process.env.S3_BUCKET;
  if (endpoint && accessKey && secretKey && bucket) {
    return new S3CompatibleStorageProvider({
      endpoint,
      region: process.env.S3_REGION || process.env.AWS_REGION || "ap-southeast-1",
      accessKey,
      secretKey,
      bucket,
      forcePathStyle: true,
    });
  }
  return getSharedMemoryStorage();
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

/** AWS MediaConvert adapter — CreateJob when credentials + endpoint present. */
export class MediaConvertTranscodeAdapter implements TranscodePort {
  async enqueue(input: {
    videoId: string;
    sourceKey: string;
    outputPrefix: string;
  }): Promise<{ jobId: string }> {
    const role = process.env.MEDIACONVERT_ROLE_ARN;
    const endpoint = process.env.MEDIACONVERT_ENDPOINT;
    const queue = process.env.MEDIACONVERT_QUEUE_ARN;
    const bucket = process.env.S3_BUCKET_PRIVATE || process.env.S3_BUCKET || "edu-private";
    const region = process.env.S3_REGION || process.env.AWS_REGION || "ap-southeast-1";

    if (!role || !endpoint || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      return { jobId: `mc-local-${input.videoId}` };
    }

    const destination = `s3://${bucket}/${input.outputPrefix}/`;
    const fileInput = input.sourceKey.startsWith("s3://")
      ? input.sourceKey
      : `s3://${bucket}/${input.sourceKey}`;

    const body = {
      Role: role,
      ...(queue ? { Queue: queue } : {}),
      UserMetadata: { videoId: input.videoId },
      Settings: {
        Inputs: [
          {
            FileInput: fileInput,
            AudioSelectors: {
              "Audio Selector 1": { DefaultSelection: "DEFAULT" },
            },
            VideoSelector: {},
          },
        ],
        OutputGroups: [
          {
            Name: "HLS",
            OutputGroupSettings: {
              Type: "HLS_GROUP_SETTINGS",
              HlsGroupSettings: {
                Destination: destination,
                SegmentLength: 6,
                MinSegmentLength: 0,
              },
            },
            Outputs: [
              {
                ContainerSettings: { Container: "M3U8" },
                VideoDescription: {
                  CodecSettings: {
                    Codec: "H_264",
                    H264Settings: {
                      RateControlMode: "QVBR",
                      MaxBitrate: 2_500_000,
                    },
                  },
                },
                AudioDescriptions: [
                  {
                    CodecSettings: {
                      Codec: "AAC",
                      AacSettings: {
                        Bitrate: 96_000,
                        CodingMode: "CODING_MODE_2_0",
                        SampleRate: 48_000,
                      },
                    },
                  },
                ],
                NameModifier: "_720",
              },
            ],
          },
        ],
      },
    };

    try {
      const { SignAWS4 } = await import("./aws4");
      const url = new URL(`${endpoint.replace(/\/$/, "")}/2017-08-29/jobs`);
      const payload = JSON.stringify(body);
      const headers = SignAWS4.sign({
        method: "POST",
        url,
        region,
        service: "mediaconvert",
        body: payload,
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        sessionToken: process.env.AWS_SESSION_TOKEN,
      });
      const res = await fetch(url.toString(), {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: payload,
      });
      if (!res.ok) {
        const text = await res.text();
        console.error("[MediaConvert] CreateJob failed", res.status, text.slice(0, 300));
        return { jobId: `mc-error-${input.videoId}-${Date.now()}` };
      }
      const json = (await res.json()) as { Job?: { Id?: string } };
      return { jobId: json.Job?.Id || `mc-${input.videoId}-${Date.now()}` };
    } catch (e) {
      console.error("[MediaConvert] enqueue error", e);
      return { jobId: `mc-fallback-${input.videoId}-${Date.now()}` };
    }
  }
}

export function createTranscodeFromEnv(): TranscodePort {
  if (process.env.MEDIACONVERT_ENDPOINT || process.env.AWS_REGION) {
    return new MediaConvertTranscodeAdapter();
  }
  return new NoopTranscodeAdapter();
}
