export const LANDING_KINDS = ["shopee", "tiktok", "web", "none"] as const;
export type LandingKind = (typeof LANDING_KINDS)[number];

export const LANDING_KIND_VI: Record<LandingKind, string> = {
  shopee: "Shopee",
  tiktok: "TikTok",
  web: "Web / landing",
  none: "Chưa có đích",
};

function safeUrl(raw: string | null | undefined): URL | null {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) {
    return null;
  }
  try {
    return new URL(trimmed);
  } catch {
    return null;
  }
}

export function classifyLanding(raw: string | null | undefined): LandingKind {
  const url = safeUrl(raw);
  if (!url) {
    return "none";
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return "none";
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (
    host === "shopee.vn" ||
    host.endsWith(".shopee.vn") ||
    host === "shopee.com" ||
    host === "shope.ee"
  ) {
    return "shopee";
  }
  if (
    host === "tiktok.com" ||
    host.endsWith(".tiktok.com") ||
    host === "vt.tiktok.com" ||
    host === "vm.tiktok.com"
  ) {
    return "tiktok";
  }
  return "web";
}

/** Stable shop/store key from a user-pasted landing — not scraped. */
export function shopKey(raw: string | null | undefined): string | null {
  const url = safeUrl(raw);
  if (!url || (url.protocol !== "http:" && url.protocol !== "https:")) {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const kind = classifyLanding(url.toString());
  const parts = url.pathname.split("/").filter(Boolean);
  if (kind === "shopee") {
    const shop = parts[0];
    return shop ? `shopee:${shop.toLowerCase()}` : `shopee:${host}`;
  }
  if (kind === "tiktok") {
    const handle = parts.find((part) => part.startsWith("@")) ?? parts[0];
    return handle ? `tiktok:${handle.toLowerCase()}` : `tiktok:${host}`;
  }
  return `web:${host}`;
}

export function isLandingKind(value: string): value is LandingKind {
  return (LANDING_KINDS as readonly string[]).includes(value);
}
