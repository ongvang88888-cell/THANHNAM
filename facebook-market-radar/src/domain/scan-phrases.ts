import { normalizeTitle } from "./clustering";

/** Function words and marketplace noise — not useful Ad Library product queries. */
const STOP = new Set([
  "va",
  "và",
  "cua",
  "của",
  "cho",
  "voi",
  "với",
  "mot",
  "một",
  "cac",
  "các",
  "nay",
  "này",
  "duoc",
  "được",
  "khong",
  "không",
  "khi",
  "ban",
  "bạn",
  "minh",
  "mình",
  "hom",
  "hôm",
  "chi",
  "chỉ",
  "gia",
  "giá",
  "ship",
  "free",
  "inbox",
  "zalo",
  "ngay",
  "ngày",
  "mua",
  "hang",
  "hàng",
  "la",
  "là",
  "de",
  "để",
  "se",
  "sẽ",
  "co",
  "có",
  "da",
  "đã",
  "nhe",
  "nhé",
  "oi",
  "ơi",
  "facebook",
  "shopee",
  "tiktok",
  "http",
  "https",
  "www",
  "vnd",
  "vnđ",
  "dong",
  "đồng",
  "hop",
  "hộp",
  "buoi",
  "buổi",
  "toi",
  "tối",
  "phi",
  "phí",
  "hoc",
  "học",
  "trieu",
  "triệu",
  "nghin",
  "nghìn",
  "ngan",
  "ngàn",
  "tram",
  "trăm",
]);

/** 249.000đ / 1.2 triệu / 590k — leftover after punctuation split is not a product query. */
const PRICE_CHUNK =
  /\d{1,3}(?:[.\s]\d{3})+(?:[.,]\d+)?(?:\s*(?:đ|d|vnd|vnđ|đồng|k))?|\d+(?:[.,]\d+)?\s*(?:triệu|trieu|nghìn|nghin|ngàn|ngan|k)\b|\d+\s*k\b/gi;

function stripPriceChunks(text: string): string {
  return text.replace(PRICE_CHUNK, " ");
}

function isPriceToken(token: string): boolean {
  const t = token.toLowerCase();
  if (/^\d+[kđd]$/i.test(t)) {
    return true;
  }
  if (/^0+\d*đ?$/i.test(t) || /^\d+000đ?$/i.test(t)) {
    return true;
  }
  if (/^\d+(đ|vnd|vnđ)$/i.test(t)) {
    return true;
  }
  return false;
}

export function isContentToken(token: string): boolean {
  const t = token.trim().toLowerCase();
  if (t.length < 2 || STOP.has(t) || isPriceToken(t)) {
    return false;
  }
  if (/^\d+$/.test(t)) {
    return false;
  }
  return true;
}

export function isPhraseQuery(query: string): boolean {
  const tokens = query.trim().split(/\s+/).filter(Boolean);
  return query.trim().length >= 4 && tokens.length >= 2;
}

function contentTokens(text: string): string[] {
  return normalizeTitle(stripPriceChunks(text)).split(" ").filter(isContentToken);
}

function uniquePhrases(phrases: string[], max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of phrases) {
    const query = raw.trim().replace(/\s+/g, " ");
    if (!isPhraseQuery(query)) {
      continue;
    }
    const key = normalizeTitle(query);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(query);
    if (out.length >= max) {
      break;
    }
  }
  return out;
}

function ngrams(tokens: string[], size: number): string[] {
  const out: string[] = [];
  for (let i = 0; i + size <= tokens.length; i += 1) {
    out.push(tokens.slice(i, i + size).join(" "));
  }
  return out;
}

/** 2–3 word product phrases from ad body / title. Server never fetches Facebook. */
export function extractCopyPhrases(text: string, max = 8): string[] {
  const tokens = contentTokens(text);
  return uniquePhrases([...ngrams(tokens, 3), ...ngrams(tokens, 2)], max);
}

/** Full name plus leading 2–4 word slices — skip mid-title fragments like “điều rang”. */
export function nameVariantQueries(name: string, max = 6): string[] {
  const trimmed = name.trim().replace(/\s+/g, " ");
  const tokens = contentTokens(trimmed);
  const prefixes: string[] = [];
  for (let n = Math.min(4, tokens.length); n >= 2; n -= 1) {
    prefixes.push(tokens.slice(0, n).join(" "));
  }
  return uniquePhrases([trimmed, ...prefixes], max);
}

export function snippetAround(text: string, query: string, radius = 48): string {
  const hay = text.replace(/\s+/g, " ").trim();
  if (!hay) {
    return "";
  }
  const needle = query.trim();
  const idx = hay.toLowerCase().indexOf(needle.toLowerCase());
  if (idx < 0) {
    return hay.length > radius * 2 ? `${hay.slice(0, radius * 2)}…` : hay;
  }
  const start = Math.max(0, idx - radius);
  const end = Math.min(hay.length, idx + needle.length + radius);
  return `${start > 0 ? "…" : ""}${hay.slice(start, end)}${end < hay.length ? "…" : ""}`;
}
