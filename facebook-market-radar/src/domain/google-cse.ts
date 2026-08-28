import { classifyLanding, safeLandingHref, type LandingKind } from "./landing";

export const LISTING_SEARCH_SITES = ["shopee", "lazada", "tiki", "sendo"] as const;
export type ListingSearchSite = (typeof LISTING_SEARCH_SITES)[number];

export const CSE_SITE_HOST: Record<ListingSearchSite, string> = {
  shopee: "shopee.vn",
  lazada: "lazada.vn",
  tiki: "tiki.vn",
  sendo: "sendo.vn",
};

export type CseListingHit = {
  url: string;
  title: string;
  site: ListingSearchSite;
};

export function sanitizeCseQueryTitle(title: string): string {
  return title
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export function cseQueryForSite(title: string, site: ListingSearchSite): string {
  const q = sanitizeCseQueryTitle(title);
  return q ? `${q} site:${CSE_SITE_HOST[site]}` : `site:${CSE_SITE_HOST[site]}`;
}

export function isListingSearchSite(value: string): value is ListingSearchSite {
  return (LISTING_SEARCH_SITES as readonly string[]).includes(value);
}

export function listingKindForSite(site: ListingSearchSite): LandingKind {
  return site;
}

export function officialListingUrl(raw: string, site: ListingSearchSite): string | null {
  const href = safeLandingHref(raw);
  if (!href) {
    return null;
  }
  return classifyLanding(href) === site ? href : null;
}

/** Parse official Custom Search JSON. Drop links that are not the requested marketplace host. */
export function parseGoogleCseItems(payload: unknown, site: ListingSearchSite): CseListingHit[] {
  if (typeof payload !== "object" || payload === null || !("items" in payload)) {
    return [];
  }
  const items = (payload as { items: unknown }).items;
  if (!Array.isArray(items)) {
    return [];
  }
  const out: CseListingHit[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (typeof item !== "object" || item === null) {
      continue;
    }
    const row = item as { link?: unknown; title?: unknown };
    const href = officialListingUrl(typeof row.link === "string" ? row.link : "", site);
    if (!href || seen.has(href)) {
      continue;
    }
    seen.add(href);
    out.push({
      url: href,
      title: typeof row.title === "string" ? row.title.trim() : "",
      site,
    });
  }
  return out;
}
