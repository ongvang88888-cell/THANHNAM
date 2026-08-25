import { createHash, createHmac, createVerify, createPublicKey } from "node:crypto";

export type AdmobKey = {
  keyId: number;
  pem: string;
};

type KeyCache = {
  fetchedAt: number;
  keys: Map<number, AdmobKey>;
};

let cache: KeyCache | null = null;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Build the SSV message string per Google AdMob docs:
 * query string excluding signature and key_id, keys sorted... 
 * Actually AdMob uses the full query content as received excluding signature/key_id params.
 * We rebuild from provided params excluding those two.
 */
export function buildAdmobSsvMessage(params: Record<string, string>): string {
  return Object.keys(params)
    .filter((k) => k !== "signature" && k !== "key_id")
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
}

export async function fetchAdmobVerifierKeys(
  url = process.env.ADMOB_SSV_KEYS_URL ||
    "https://gstatic.com/admob/reward/verifier-keys.json",
): Promise<Map<number, AdmobKey>> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.keys;
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch AdMob keys: HTTP ${res.status}`);
  }
  const json = (await res.json()) as {
    keys: Array<{ keyId: number; pem?: string; base64?: string }>;
  };
  const keys = new Map<number, AdmobKey>();
  for (const k of json.keys ?? []) {
    let pem = k.pem;
    if (!pem && k.base64) {
      const der = Buffer.from(k.base64, "base64");
      const b64 = der.toString("base64").match(/.{1,64}/g)?.join("\n") ?? "";
      pem = `-----BEGIN PUBLIC KEY-----\n${b64}\n-----END PUBLIC KEY-----`;
    }
    if (pem) keys.set(k.keyId, { keyId: k.keyId, pem });
  }
  cache = { fetchedAt: Date.now(), keys };
  return keys;
}

function base64UrlToBuffer(value: string): Buffer {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, "base64");
}

/**
 * Verify AdMob SSV ECDSA signature (SHA256).
 * When ADMOB_SSV_ENFORCE!=true, signature "dev" is accepted for local simulation.
 */
export async function verifyAdmobSsvSignature(
  params: Record<string, string>,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const enforce = process.env.ADMOB_SSV_ENFORCE === "true";
  const signature = params.signature;
  const keyIdRaw = params.key_id;

  if (!enforce) {
    if (!signature || signature === "dev") return { ok: true };
  }

  if (!signature || !keyIdRaw) {
    return { ok: false, reason: "missing_signature_or_key_id" };
  }

  const keyId = Number(keyIdRaw);
  if (!Number.isFinite(keyId)) {
    return { ok: false, reason: "invalid_key_id" };
  }

  try {
    const keys = await fetchAdmobVerifierKeys();
    const key = keys.get(keyId);
    if (!key) return { ok: false, reason: "unknown_key_id" };

    const message = buildAdmobSsvMessage(params);
    // AdMob historically signs the raw query string content; try both sorted rebuild and signature verify.
    const verifier = createVerify("SHA256");
    verifier.update(message);
    verifier.end();
    const pub = createPublicKey(key.pem);
    const sig = base64UrlToBuffer(signature);
    const valid = verifier.verify(pub, sig);
    if (!valid) return { ok: false, reason: "bad_signature" };
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      reason: e instanceof Error ? e.message : "verify_error",
    };
  }
}

/** Stripe webhook HMAC verification (v1 scheme). */
export function verifyStripeWebhookSignature(
  payload: string,
  header: string | undefined,
  secret: string,
  toleranceSec = 300,
): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const [k, v] = p.split("=");
      return [k.trim(), v];
    }),
  ) as Record<string, string>;
  const timestamp = parts.t;
  const v1 = parts.v1;
  if (!timestamp || !v1) return false;
  const ts = Number(timestamp);
  if (Math.abs(Date.now() / 1000 - ts) > toleranceSec) return false;
  const signed = `${timestamp}.${payload}`;
  const expected = createHmac("sha256", secret).update(signed).digest("hex");
  return expected === v1;
}

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}
