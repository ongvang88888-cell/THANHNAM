import { textsMatchScanQuery } from "./ad-library-scan";
import { buildAdLibraryPageUrl, buildAdLibrarySearchUrl } from "./ad-library-url";
import { detectCreativeAngles, hookLine, mediaType, type CreativeAngle } from "./creative-angles";
import { isStrongProduct } from "./industry-stats";
import { classifyLanding, isLandingKind, shopKey, urlsFromSavedCopy, type LandingKind } from "./landing";
import { nicheGroup } from "./niches";
import { adAgeDays } from "./scoring";
import { extractCopyPhrases } from "./scan-phrases";
import type { RankingRow } from "./weekly-report";

const WEEK_MS = 7 * 86_400_000;

export type TrendLane = "trending" | "fresh" | "other";

export type SavedAdLite = {
  libraryId: string;
  pageId: string;
  clusterSlug: string;
  startDate: string;
  isActive: boolean;
  body: string | null;
  title: string | null;
  landingUrl: string | null;
  imageUrl: string | null;
  listingPriceVnd: number | null;
  firstSeenMs: number;
  lastSeenMs: number;
  userAngles?: CreativeAngle[];
};

export type ResearchRow = RankingRow & {
  firstSeenMs: number;
  lastSeenMs: number;
  daysRunning: number;
  landingKinds: LandingKind[];
  hasLanding: boolean;
  shopKeys: string[];
  angles: CreativeAngle[];
  media: "image" | "text" | "both";
  hook: string;
  lane: TrendLane;
};

export type SavedFilter = {
  ten?: string;
  niche?: string;
  group?: string;
  minDays?: number;
  minPages?: number;
  landing?: "any" | "yes" | "no";
  landingKind?: LandingKind;
  angle?: CreativeAngle;
  media?: "image" | "text";
  minPrice?: number;
  maxPrice?: number;
  lane?: TrendLane | "all";
  shop?: string;
};

export function daysRunning(ads: readonly SavedAdLite[], nowMs: number): number {
  const ages = ads.filter((ad) => ad.isActive).map((ad) => adAgeDays(ad.startDate, nowMs));
  return ages.length > 0 ? Math.max(...ages) : 0;
}

export function classifyTrendLane(row: RankingRow, ads: readonly SavedAdLite[], nowMs: number): TrendLane {
  const first = ads.reduce((min, ad) => Math.min(min, ad.firstSeenMs), Number.POSITIVE_INFINITY);
  const fresh = Number.isFinite(first) && nowMs - first <= WEEK_MS;
  if (isStrongProduct(row)) {
    return "trending";
  }
  if (fresh || (row.scores.velocity >= 10 && row.scores.longevity < 40)) {
    return "fresh";
  }
  return "other";
}

export function enrichResearchRow(
  row: RankingRow,
  ads: readonly SavedAdLite[],
  nowMs: number,
): ResearchRow {
  const clusterAds = ads.filter((ad) => ad.clusterSlug === row.clusterSlug);
  const kinds = new Set<LandingKind>();
  const shops = new Set<string>();
  const angles = new Set<CreativeAngle>();
  let image = false;
  let text = false;
  let firstSeenMs = nowMs;
  let lastSeenMs = 0;
  for (const ad of clusterAds) {
    const urls = urlsFromSavedCopy(ad.landingUrl, ad.body, ad.title);
    for (const href of urls) {
      kinds.add(classifyLanding(href));
      const shop = shopKey(href);
      if (shop) {
        shops.add(shop);
      }
    }
    for (const angle of [...detectCreativeAngles([ad.title, ad.body, row.clusterTitle]), ...(ad.userAngles ?? [])]) {
      angles.add(angle);
    }
    if (mediaType(ad.imageUrl) === "image") {
      image = true;
    } else {
      text = true;
    }
    firstSeenMs = Math.min(firstSeenMs, ad.firstSeenMs);
    lastSeenMs = Math.max(lastSeenMs, ad.lastSeenMs);
  }
  const landingKinds = [...kinds].filter((kind) => kind !== "none");
  return {
    ...row,
    firstSeenMs: clusterAds.length ? firstSeenMs : 0,
    lastSeenMs: clusterAds.length ? lastSeenMs : 0,
    daysRunning: daysRunning(clusterAds, nowMs),
    landingKinds,
    hasLanding: landingKinds.length > 0,
    shopKeys: [...shops],
    angles: [...angles],
    media: image && text ? "both" : image ? "image" : "text",
    hook: hookLine(clusterAds.flatMap((ad) => [ad.title, ad.body, row.clusterTitle])),
    lane: classifyTrendLane(row, clusterAds, nowMs),
  };
}

export function filterResearchRows(rows: readonly ResearchRow[], filter: SavedFilter): ResearchRow[] {
  const ten = filter.ten?.trim() ?? "";
  return rows.filter((row) => {
    if (filter.niche && row.nicheSlug !== filter.niche) {
      return false;
    }
    if (filter.group && nicheGroup(row.nicheSlug) !== filter.group) {
      return false;
    }
    if (ten.length >= 2 && !textsMatchScanQuery(ten, [row.clusterTitle, row.nicheName, row.hook])) {
      return false;
    }
    if (filter.minDays != null && row.daysRunning < filter.minDays) {
      return false;
    }
    if (filter.minPages != null && row.distinctPageCount < filter.minPages) {
      return false;
    }
    if (filter.landing === "yes" && !row.hasLanding) {
      return false;
    }
    if (filter.landing === "no" && row.hasLanding) {
      return false;
    }
    if (filter.landingKind && !row.landingKinds.includes(filter.landingKind)) {
      return false;
    }
    if (filter.angle && !row.angles.includes(filter.angle)) {
      return false;
    }
    if (filter.media === "image" && row.media === "text") {
      return false;
    }
    if (filter.media === "text" && row.media === "image") {
      return false;
    }
    if (filter.minPrice != null && (row.price.midVnd ?? 0) < filter.minPrice) {
      return false;
    }
    if (filter.maxPrice != null && (row.price.midVnd ?? Number.POSITIVE_INFINITY) > filter.maxPrice) {
      return false;
    }
    if (filter.lane && filter.lane !== "all" && row.lane !== filter.lane) {
      return false;
    }
    const shop = filter.shop?.trim().toLowerCase() ?? "";
    if (shop.length >= 2 && !row.shopKeys.some((key) => key.includes(shop))) {
      return false;
    }
    return true;
  });
}

export function splitTrendLanes(rows: readonly ResearchRow[]): {
  trending: ResearchRow[];
  fresh: ResearchRow[];
} {
  return {
    trending: rows.filter((row) => row.lane === "trending"),
    fresh: rows.filter((row) => row.lane === "fresh"),
  };
}

export type HookDigestRow = {
  phrase: string;
  count: number;
  nicheSlug: string;
  libraryUrl: string;
};

export function hookDigest(
  ads: readonly SavedAdLite[],
  nicheByCluster: ReadonlyMap<string, string>,
  nicheSlug?: string,
  limit = 24,
): HookDigestRow[] {
  const counts = new Map<string, { count: number; nicheSlug: string }>();
  for (const ad of ads) {
    if (!ad.isActive) {
      continue;
    }
    const niche = nicheByCluster.get(ad.clusterSlug) ?? "khac";
    if (nicheSlug && niche !== nicheSlug) {
      continue;
    }
    for (const phrase of extractCopyPhrases([ad.title, ad.body].filter(Boolean).join(" "), 8)) {
      const key = `${niche}::${phrase}`;
      const prev = counts.get(key);
      counts.set(key, { count: (prev?.count ?? 0) + 1, nicheSlug: niche });
    }
  }
  return [...counts.entries()]
    .map(([key, value]) => {
      const phrase = key.slice(key.indexOf("::") + 2);
      return {
        phrase,
        count: value.count,
        nicheSlug: value.nicheSlug,
        libraryUrl: buildAdLibrarySearchUrl(phrase),
      };
    })
    .sort((a, b) => b.count - a.count || a.phrase.localeCompare(b.phrase, "vi"))
    .slice(0, limit);
}

export type DossierAd = SavedAdLite & {
  landingKind: LandingKind;
  shop: string | null;
  angles: CreativeAngle[];
  pageLibraryUrl: string;
};

export type ProductDossier = {
  row: ResearchRow;
  ads: DossierAd[];
  pages: Array<{ pageId: string; adCount: number; libraryUrl: string }>;
  shops: string[];
  relatedSlugs: string[];
  officialSearchUrl: string;
};

export function buildProductDossier(
  row: ResearchRow,
  ads: readonly SavedAdLite[],
  _nowMs: number,
): ProductDossier {
  const clusterAds = ads.filter((ad) => ad.clusterSlug === row.clusterSlug);
  const mapped: DossierAd[] = clusterAds.map((ad) => ({
    ...ad,
    landingKind: classifyLanding(ad.landingUrl),
    shop: shopKey(ad.landingUrl),
    angles: [...new Set([...detectCreativeAngles([ad.title, ad.body]), ...(ad.userAngles ?? [])])],
    pageLibraryUrl: buildAdLibraryPageUrl(ad.pageId),
  }));
  const pageMap = new Map<string, number>();
  for (const ad of mapped) {
    pageMap.set(ad.pageId, (pageMap.get(ad.pageId) ?? 0) + 1);
  }
  const shops = [...new Set(mapped.map((ad) => ad.shop).filter((item): item is string => Boolean(item)))];
  const related = new Set<string>();
  for (const ad of ads) {
    const shop = shopKey(ad.landingUrl);
    if (shop && shops.includes(shop) && ad.clusterSlug !== row.clusterSlug) {
      related.add(ad.clusterSlug);
    }
  }
  return {
    row,
    ads: mapped.sort((a, b) => b.lastSeenMs - a.lastSeenMs),
    pages: [...pageMap.entries()].map(([pageId, adCount]) => ({
      pageId,
      adCount,
      libraryUrl: buildAdLibraryPageUrl(pageId),
    })),
    shops,
    relatedSlugs: [...related],
    officialSearchUrl: buildAdLibrarySearchUrl(row.clusterTitle),
  };
}

export function watchedPageNewAdAlerts(
  watches: readonly { pageId: string; pageName: string | null }[],
  ads: readonly SavedAdLite[],
  pages: readonly { pageId: string; pageName: string }[],
  nowMs: number,
): Array<{ pageId: string; clusterSlug: string; title: string; detail: string }> {
  const watched = new Set(watches.map((row) => row.pageId));
  const nameById = new Map(pages.map((page) => [page.pageId, page.pageName]));
  const out: Array<{ pageId: string; clusterSlug: string; title: string; detail: string }> = [];
  for (const ad of ads) {
    if (!watched.has(ad.pageId) || nowMs - ad.firstSeenMs > WEEK_MS) {
      continue;
    }
    const pageName = watches.find((row) => row.pageId === ad.pageId)?.pageName || nameById.get(ad.pageId) || ad.pageId;
    out.push({
      pageId: ad.pageId,
      clusterSlug: ad.clusterSlug,
      title: `Trang đang theo có thẻ mới: ${pageName}`,
      detail: `Vừa lưu ${ad.libraryId} cho cụm ${ad.clusterSlug}. Mở Thư viện trang để bắt thêm bài — Radar không tự kéo.`,
    });
  }
  return out;
}

export function parseSavedFilter(params: {
  ten?: string;
  niche?: string;
  group?: string;
  minDays?: string;
  minPages?: string;
  landing?: string;
  landingKind?: string;
  angle?: string;
  media?: string;
  minPrice?: string;
  maxPrice?: string;
  lane?: string;
  shop?: string;
}): SavedFilter {
  const num = (raw: string | undefined): number | undefined => {
    if (!raw || raw.trim() === "") {
      return undefined;
    }
    const value = Number(raw);
    return Number.isFinite(value) ? value : undefined;
  };
  const landing = params.landing === "yes" || params.landing === "no" ? params.landing : "any";
  const media = params.media === "image" || params.media === "text" ? params.media : undefined;
  const lane =
    params.lane === "trending" || params.lane === "fresh" || params.lane === "other" || params.lane === "all"
      ? params.lane
      : "all";
  return {
    ten: params.ten?.trim() || undefined,
    niche: params.niche?.trim() || undefined,
    group: params.group?.trim() || undefined,
    minDays: num(params.minDays),
    minPages: num(params.minPages),
    landing,
    landingKind: params.landingKind && isLandingKind(params.landingKind) && params.landingKind !== "none"
      ? params.landingKind
      : undefined,
    angle:
      params.angle === "price" ||
      params.angle === "ugc" ||
      params.angle === "before_after" ||
      params.angle === "testimonial" ||
      params.angle === "combo" ||
      params.angle === "official" ||
      params.angle === "wholesale" ||
      params.angle === "shipping"
        ? params.angle
        : undefined,
    media,
    minPrice: num(params.minPrice),
    maxPrice: num(params.maxPrice),
    lane,
    shop: params.shop?.trim() || undefined,
  };
}

const TAG_RE = /^[a-z0-9_-]{2,32}$/;

export function sanitizeUserTags(raw: readonly string[]): string[] {
  const out = new Set<string>();
  for (const item of raw) {
    const tag = item.trim().toLowerCase().replace(/\s+/g, "_").slice(0, 32);
    if (TAG_RE.test(tag)) {
      out.add(tag);
    }
  }
  return [...out].slice(0, 16);
}
