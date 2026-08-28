import type { ChannelAnalysisRow } from "./channel-analysis";
import {
  filterBestsellerCatalog,
  PLATFORM_BESTSELLER_TARGET,
  type BestsellerCatalogItem,
} from "./bestseller-catalog";
import { normalizeTitle } from "./clustering";
import { isLockedNiche } from "./niches";
import {
  officialLinkForTab,
  parsePlatformTab,
  PLATFORM_TAB_IDS,
  type PlatformTabId,
} from "./platform-dashboards";
import { parseChannelMetricSource } from "./sales-channels";

export { PLATFORM_BESTSELLER_TARGET };
export const TOP_PAGE_SIZE = 50;

/** Thứ tự ưu tiên ngành theo kênh — nghiên cứu, không phải GMV thật. */
export const PLATFORM_NICHE_WEIGHTS: Record<PlatformTabId, readonly string[]> = {
  facebook: ["my-pham", "me-be", "gadget", "tpcn", "dien-tu"],
  instagram: ["my-pham", "thoi-trang-nu", "cham-soc-ca-nhan", "thoi-trang-nam"],
  google: ["dien-tu", "khoa-hoc", "my-pham", "dien-may"],
  youtube: ["dien-tu", "khoa-hoc", "gadget", "dien-may"],
  tiktok: ["my-pham", "thoi-trang-nu", "gadget", "me-be"],
  shopee: ["me-be", "thuc-pham", "nha-bep", "my-pham", "thoi-trang-nu"],
  lazada: ["dien-tu", "dien-may", "gadget", "me-be"],
  tiki: ["sach-vpp", "tpcn", "dien-tu", "me-be"],
  sendo: ["nha-cua", "thoi-trang-nu", "thuc-pham", "nha-bep"],
};

export type WarehouseOverlay = {
  clusterSlug: string;
  clusterTitle: string;
  soldTotal: number;
  soldShopee: number | null;
  soldLazada: number | null;
  soldTiki: number | null;
  soldSendo: number | null;
  soldTiktok: number | null;
  googleAdsSeen: number | null;
  youtubeAdsSeen: number | null;
  tiktokAdsSeen: number | null;
  youtubeViews: number | null;
  fbActiveAds: number;
  fbHeat: number;
  composite: number;
};

export type PlatformBestsellerRow = {
  rank: number;
  catalogId: string;
  title: string;
  nicheSlug: string;
  nicheName: string;
  depth: BestsellerCatalogItem["depth"];
  officialUrl: string;
  overlay: WarehouseOverlay | null;
  researchOnly: true;
};

export type PlatformBestsellerPage = {
  tab: PlatformTabId;
  niche: string | "all";
  q: string;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  rows: PlatformBestsellerRow[];
  warehouseMatchCount: number;
  autoCrawl: false;
  nationalDump: false;
};

export function officialCatalogUrl(tab: PlatformTabId, title: string): string {
  return officialLinkForTab(tab, title);
}

export function officialHostForTab(tab: PlatformTabId): string {
  const url = officialCatalogUrl(tab, "serum");
  return new URL(url).hostname.replace(/^www\./, "");
}

export function catalogMatchTokens(title: string): string[] {
  return normalizeTitle(title)
    .split(/\s+/)
    .filter((token) => token.length >= 3);
}

/**
 * Chỉ gắn số kho khi cụm tiêu đề chứa đủ token catalog (≥2) hoặc khớp normalize.
 * "serum" không ăn số của "serum vitamin c".
 */
export function catalogMatchesWarehouse(catalogTitle: string, warehouseTitle: string): boolean {
  const a = normalizeTitle(catalogTitle);
  const b = normalizeTitle(warehouseTitle);
  if (a.length < 3 || b.length < 3) {
    return false;
  }
  if (a === b) {
    return true;
  }
  const tokens = catalogMatchTokens(catalogTitle);
  if (tokens.length < 2) {
    return false;
  }
  return tokens.every((token) => b.includes(token));
}

export function toWarehouseOverlay(row: ChannelAnalysisRow): WarehouseOverlay {
  return {
    clusterSlug: row.clusterSlug,
    clusterTitle: row.clusterTitle,
    soldTotal: row.soldTotal,
    soldShopee: row.sold.shopee,
    soldLazada: row.sold.lazada,
    soldTiki: row.sold.tiki,
    soldSendo: row.sold.sendo,
    soldTiktok: row.sold.tiktok,
    googleAdsSeen: row.googleAdsSeen,
    youtubeAdsSeen: row.youtubeAdsSeen,
    tiktokAdsSeen: row.tiktokAdsSeen,
    youtubeViews: row.youtubeViews,
    fbActiveAds: row.fbActiveAds,
    fbHeat: row.fbHeat,
    composite: row.composite,
  };
}

export function findWarehouseOverlay(
  catalogTitle: string,
  rows: readonly ChannelAnalysisRow[],
): WarehouseOverlay | null {
  const hit = rows.find((row) => catalogMatchesWarehouse(catalogTitle, row.clusterTitle));
  return hit ? toWarehouseOverlay(hit) : null;
}

export function rankCatalogForPlatform(
  tab: PlatformTabId,
  catalog: readonly BestsellerCatalogItem[],
): BestsellerCatalogItem[] {
  const preferred = PLATFORM_NICHE_WEIGHTS[tab];
  const weight = (nicheSlug: string): number => {
    const index = preferred.indexOf(nicheSlug);
    return index === -1 ? preferred.length + 1 : index;
  };
  return [...catalog].sort((a, b) => {
    const dw = weight(a.nicheSlug) - weight(b.nicheSlug);
    if (dw !== 0) {
      return dw;
    }
    return a.title.localeCompare(b.title, "vi");
  });
}

export function parseTopPage(value: string | number | null | undefined): number {
  const n = typeof value === "number" ? value : Number(value ?? 1);
  if (!Number.isFinite(n) || n < 1) {
    return 1;
  }
  return Math.floor(n);
}

export function topHref(
  tab: PlatformTabId,
  opts: { niche?: string; q?: string; trang?: number } = {},
): string {
  const params = new URLSearchParams();
  if (opts.niche?.trim() && opts.niche !== "all") {
    params.set("niche", opts.niche.trim());
  }
  if (opts.q?.trim()) {
    params.set("q", opts.q.trim());
  }
  if (opts.trang && opts.trang > 1) {
    params.set("trang", String(opts.trang));
  }
  const query = params.toString();
  return query ? `/top/${tab}?${query}` : `/top/${tab}`;
}

export function pageBestsellers(input: {
  tab: PlatformTabId;
  catalog: readonly BestsellerCatalogItem[];
  warehouse: readonly ChannelAnalysisRow[];
  trang?: number;
  niche?: string;
  q?: string;
}): PlatformBestsellerPage {
  const ranked = rankCatalogForPlatform(input.tab, input.catalog);
  const total = ranked.length;
  const totalPages = Math.max(1, Math.ceil(total / TOP_PAGE_SIZE));
  const page = Math.min(Math.max(parseTopPage(input.trang), 1), totalPages);
  const start = (page - 1) * TOP_PAGE_SIZE;
  const slice = ranked.slice(start, start + TOP_PAGE_SIZE);
  const warehouseMatchCount = ranked.filter((entry) => findWarehouseOverlay(entry.title, input.warehouse)).length;
  const rows: PlatformBestsellerRow[] = slice.map((entry, i) => ({
    rank: start + i + 1,
    catalogId: entry.id,
    title: entry.title,
    nicheSlug: entry.nicheSlug,
    nicheName: entry.nicheName,
    depth: entry.depth,
    officialUrl: officialCatalogUrl(input.tab, entry.title),
    overlay: findWarehouseOverlay(entry.title, input.warehouse),
    researchOnly: true,
  }));
  return {
    tab: input.tab,
    niche: input.niche && input.niche !== "all" ? input.niche : "all",
    q: input.q?.trim() ?? "",
    page,
    pageSize: TOP_PAGE_SIZE,
    total,
    totalPages,
    rows,
    warehouseMatchCount,
    autoCrawl: false,
    nationalDump: false,
  };
}

export function buildPlatformBestsellerPage(input: {
  tab: string | PlatformTabId;
  niche?: string;
  q?: string;
  trang?: number;
  warehouse: readonly ChannelAnalysisRow[];
}): PlatformBestsellerPage {
  const tab = parsePlatformTab(typeof input.tab === "string" ? input.tab : input.tab);
  const niche = input.niche && isLockedNiche(input.niche) ? input.niche : undefined;
  const catalog = filterBestsellerCatalog(niche, input.q);
  return pageBestsellers({
    tab,
    catalog,
    warehouse: input.warehouse,
    trang: input.trang,
    niche,
    q: input.q,
  });
}

export function listOfficialCatalogHosts(): readonly string[] {
  return PLATFORM_TAB_IDS.map((tab) => officialHostForTab(tab));
}

export function unknownMetricSourceDoesNotBecomeShopee(): boolean {
  return parseChannelMetricSource("YOUTUBE") === null && parseChannelMetricSource("facebook") === null;
}
