/** Allowlisted official API keys. Never accept arbitrary env names from the client. */
export const PLATFORM_SECRET_KEYS = [
  "YOUTUBE_API_KEY",
  "GOOGLE_CSE_KEY",
  "GOOGLE_CSE_CX",
  "GOOGLE_API_KEY",
  "SHOPEE_PARTNER_ID",
  "SHOPEE_PARTNER_KEY",
  "SHOPEE_SHOP_ID",
  "SHOPEE_ACCESS_TOKEN",
  "LAZADA_APP_KEY",
  "LAZADA_APP_SECRET",
  "LAZADA_ACCESS_TOKEN",
  "LAZADA_SELLER_ID",
  "TIKTOK_SHOP_APP_KEY",
  "TIKTOK_SHOP_APP_SECRET",
  "TIKTOK_SHOP_ACCESS_TOKEN",
  "TIKTOK_SHOP_ID",
] as const;

export type PlatformSecretKey = (typeof PLATFORM_SECRET_KEYS)[number];
export type PlatformSecrets = Partial<Record<PlatformSecretKey, string>>;

export type PlatformSecretFlags = {
  youtube: boolean;
  googleCse: boolean;
  shopeeShop: boolean;
  lazadaShop: boolean;
  tiktokShop: boolean;
};

export const PLATFORM_KEY_GUIDES = [
  {
    id: "youtube",
    titleVi: "YouTube Data API",
    href: "https://console.cloud.google.com/apis/library/youtube.googleapis.com",
    keys: ["YOUTUBE_API_KEY"] as const,
    fills: "Lượt xem video ID đã lưu + tìm video công khai theo tên cụm. Không phải đơn hàng.",
  },
  {
    id: "cse",
    titleVi: "Google Custom Search (URL listing)",
    href: "https://programmablesearchengine.google.com/",
    keys: ["GOOGLE_CSE_KEY", "GOOGLE_CSE_CX"] as const,
    fills: "URL Tiki / Shopee / Lazada / Sendo chính thức. Không lấy đã bán.",
  },
  {
    id: "shopee",
    titleVi: "Shopee Open Platform — shop của tôi",
    href: "https://open.shopee.com/",
    keys: ["SHOPEE_PARTNER_ID", "SHOPEE_PARTNER_KEY", "SHOPEE_SHOP_ID", "SHOPEE_ACCESS_TOKEN"] as const,
    fills: "SKU shop bạn ủy quyền → /own-ads. Không thành cột đã bán đối thủ.",
  },
  {
    id: "lazada",
    titleVi: "Lazada Open Platform — shop của tôi",
    href: "https://open.lazada.com/",
    keys: ["LAZADA_APP_KEY", "LAZADA_APP_SECRET", "LAZADA_ACCESS_TOKEN", "LAZADA_SELLER_ID"] as const,
    fills: "Shop của bạn. Không scrape lazada.vn.",
  },
  {
    id: "tiktok",
    titleVi: "TikTok Shop Open — shop của tôi",
    href: "https://partner.tiktokshop.com/",
    keys: [
      "TIKTOK_SHOP_APP_KEY",
      "TIKTOK_SHOP_APP_SECRET",
      "TIKTOK_SHOP_ACCESS_TOKEN",
      "TIKTOK_SHOP_ID",
    ] as const,
    fills: "Shop của bạn. Không scrape tiktok.com.",
  },
] as const;

export function isPlatformSecretKey(value: string): value is PlatformSecretKey {
  return (PLATFORM_SECRET_KEYS as readonly string[]).includes(value);
}

export function firstNonEmpty(...values: Array<string | undefined | null>): string | undefined {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return undefined;
}

export function platformSecretFlags(secrets: PlatformSecrets): PlatformSecretFlags {
  return {
    youtube: Boolean(secrets.YOUTUBE_API_KEY),
    googleCse: Boolean((secrets.GOOGLE_CSE_KEY || secrets.GOOGLE_API_KEY) && secrets.GOOGLE_CSE_CX),
    shopeeShop: Boolean(
      secrets.SHOPEE_PARTNER_ID &&
        secrets.SHOPEE_PARTNER_KEY &&
        secrets.SHOPEE_SHOP_ID &&
        secrets.SHOPEE_ACCESS_TOKEN,
    ),
    lazadaShop: Boolean(secrets.LAZADA_APP_KEY && secrets.LAZADA_APP_SECRET && secrets.LAZADA_ACCESS_TOKEN),
    tiktokShop: Boolean(
      secrets.TIKTOK_SHOP_APP_KEY &&
        secrets.TIKTOK_SHOP_APP_SECRET &&
        secrets.TIKTOK_SHOP_ACCESS_TOKEN &&
        secrets.TIKTOK_SHOP_ID,
    ),
  };
}

export function mergePlatformSecrets(current: PlatformSecrets, patch: PlatformSecrets): PlatformSecrets {
  const next: PlatformSecrets = { ...current };
  for (const key of PLATFORM_SECRET_KEYS) {
    const incoming = patch[key];
    if (incoming === undefined) {
      continue;
    }
    const trimmed = incoming.trim();
    if (!trimmed) {
      continue;
    }
    next[key] = trimmed;
  }
  return next;
}

export function clearPlatformSecrets(current: PlatformSecrets, keys: readonly string[]): PlatformSecrets {
  const next: PlatformSecrets = { ...current };
  for (const key of keys) {
    if (isPlatformSecretKey(key)) {
      delete next[key];
    }
  }
  return next;
}

export function parsePlatformSecretsPatch(payload: unknown): {
  patch: PlatformSecrets;
  clear: PlatformSecretKey[];
} {
  const patch: PlatformSecrets = {};
  const clear: PlatformSecretKey[] = [];
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { patch, clear };
  }
  const raw = payload as Record<string, unknown>;
  for (const key of PLATFORM_SECRET_KEYS) {
    const value = raw[key];
    if (typeof value !== "string") {
      continue;
    }
    const trimmed = value.trim();
    if (trimmed) {
      patch[key] = trimmed;
    }
  }
  const clearRaw = raw.clear;
  if (Array.isArray(clearRaw)) {
    for (const item of clearRaw) {
      if (typeof item === "string" && isPlatformSecretKey(item) && !clear.includes(item)) {
        clear.push(item);
      }
    }
  }
  return { patch, clear };
}

export function applyPlatformSecretsPatch(current: PlatformSecrets, payload: unknown): PlatformSecrets {
  const { patch, clear } = parsePlatformSecretsPatch(payload);
  return mergePlatformSecrets(clearPlatformSecrets(current, clear), patch);
}

/** Env wins when non-empty so ops files still work; overlay fills blanks. */
export function resolvePlatformSecrets(
  env: Record<string, string | undefined>,
  overlay: PlatformSecrets,
): PlatformSecrets {
  const resolved: PlatformSecrets = {};
  for (const key of PLATFORM_SECRET_KEYS) {
    const value = firstNonEmpty(env[key], overlay[key]);
    if (value) {
      resolved[key] = value;
    }
  }
  return resolved;
}
