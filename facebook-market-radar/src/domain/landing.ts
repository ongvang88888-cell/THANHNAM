export const LANDING_KINDS = ["shopee", "tiktok", "lazada", "tiki", "sendo", "youtube", "web", "none"] as const;
export type LandingKind = (typeof LANDING_KINDS)[number];

export const LANDING_KIND_VI: Record<LandingKind, string> = {
  shopee: "Shopee",
  tiktok: "TikTok",
  lazada: "Lazada",
  tiki: "Tiki",
  sendo: "Sendo",
  youtube: "YouTube",
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

/** Persist / validate user-pasted landing. Empty → null. Non-http(s) throws. */
export function parseLandingUrl(raw: string | null | undefined): string | null {
  if (raw === undefined || raw === null) {
    return null;
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  const url = safeUrl(trimmed);
  if (!url || (url.protocol !== "http:" && url.protocol !== "https:")) {
    throw new Error("Landing chỉ nhận URL http hoặc https");
  }
  return url.toString();
}

/** Display-only: never throw; drop javascript:/data:/junk so href stays safe. */
export function safeLandingHref(raw: string | null | undefined): string | null {
  try {
    return parseLandingUrl(raw);
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
  if (host === "lazada.vn" || host.endsWith(".lazada.vn") || host === "lazada.com") {
    return "lazada";
  }
  if (host === "tiki.vn" || host.endsWith(".tiki.vn")) {
    return "tiki";
  }
  if (host === "sendo.vn" || host.endsWith(".sendo.vn")) {
    return "sendo";
  }
  if (host === "youtube.com" || host.endsWith(".youtube.com") || host === "youtu.be") {
    return "youtube";
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
  if (kind === "lazada" || kind === "tiki" || kind === "sendo") {
    const shop = parts[0];
    return shop ? `${kind}:${shop.toLowerCase()}` : `${kind}:${host}`;
  }
  if (kind === "youtube") {
    const handle = parts.find((part) => part.startsWith("@")) ?? parts[0];
    return handle ? `youtube:${handle.toLowerCase()}` : `youtube:${host}`;
  }
  return `web:${host}`;
}

export function isLandingKind(value: string): value is LandingKind {
  return (LANDING_KINDS as readonly string[]).includes(value);
}

const HTTP_URL_IN_TEXT = /https?:\/\/[^\s<>"'`]+/gi;
const TRAILING_PUNCT = /[.,);\]}>]+$/;

/** Pull http(s) URLs already sitting in user-saved copy — no network. */
export function extractHttpUrlsFromText(raw: string | null | undefined): string[] {
  const text = raw?.trim() ?? "";
  if (!text) {
    return [];
  }
  const found = text.match(HTTP_URL_IN_TEXT) ?? [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const match of found) {
    const cleaned = match.replace(TRAILING_PUNCT, "");
    const href = safeLandingHref(cleaned);
    if (!href || seen.has(href)) {
      continue;
    }
    seen.add(href);
    out.push(href);
  }
  return out;
}

/** landingUrl first, then URLs mined from title/body. Still no HTTP GET. */
export function urlsFromSavedCopy(
  landingUrl: string | null | undefined,
  ...texts: Array<string | null | undefined>
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (raw: string | null | undefined) => {
    const href = safeLandingHref(raw);
    if (!href || seen.has(href)) {
      return;
    }
    seen.add(href);
    out.push(href);
  };
  push(landingUrl);
  for (const text of texts) {
    for (const href of extractHttpUrlsFromText(text)) {
      push(href);
    }
  }
  return out;
}

export type IndexedLanding = Exclude<LandingKind, "none">;

export function indexLandingsByKind(
  urls: readonly (string | null | undefined)[],
): Partial<Record<IndexedLanding, string>> {
  const out: Partial<Record<IndexedLanding, string>> = {};
  for (const raw of urls) {
    const href = safeLandingHref(raw);
    if (!href) {
      continue;
    }
    const kind = classifyLanding(href);
    if (kind === "none" || out[kind]) {
      continue;
    }
    out[kind] = href;
  }
  return out;
}
