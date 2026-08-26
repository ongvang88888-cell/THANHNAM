import type { Readable } from "node:stream";

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

export interface StoredObject {
  bytes: Buffer;
  contentType: string;
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
  getObject(key: string): Promise<StoredObject | null>;
  putObject(key: string, bytes: Buffer, contentType: string): Promise<void>;
  localPath?(key: string): string | null;
  putFile?(key: string, filePath: string, contentType: string): Promise<void>;
  writeFromStream?(
    key: string,
    stream: Readable,
    contentType: string,
    opts?: { maxBytes?: number },
  ): Promise<number>;
}

export interface TranscodePort {
  enqueue(input: {
    videoId: string;
    sourceKey: string;
    outputPrefix: string;
  }): Promise<{ jobId: string }>;
}
