import { createHmac, timingSafeEqual } from "node:crypto";

export function mediaSigningSecret(): string {
  return process.env.MEDIA_SIGNING_SECRET || process.env.JWT_ACCESS_SECRET || "dev-media-signing-secret";
}

export function signLocalMedia(key: string, expMs: number): string {
  return createHmac("sha256", mediaSigningSecret()).update(`${key}:${expMs}`).digest("hex");
}

export function verifyLocalMedia(key: string, expMs: number, sig: string | undefined): boolean {
  if (!key || !sig || !Number.isFinite(expMs) || expMs < Date.now()) return false;
  const expected = signLocalMedia(key, expMs);
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function localMediaPublicBase(): string {
  const base =
    process.env.MEDIA_PUBLIC_BASE ||
    process.env.API_URL ||
    process.env.PUBLIC_WEB_URL ||
    `http://127.0.0.1:${process.env.API_PORT || 3001}`;
  return `${base.replace(/\/$/, "")}/api/v1/media/local`;
}

export function signedLocalMediaUrl(
  key: string,
  ttlSeconds: number,
): { url: string; expiresAt: Date } {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  const exp = expiresAt.getTime();
  const sig = signLocalMedia(key, exp);
  return {
    url: `${localMediaPublicBase()}?key=${encodeURIComponent(key)}&exp=${exp}&sig=${sig}`,
    expiresAt,
  };
}
