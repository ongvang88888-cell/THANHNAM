import {
  buildGoogleAdsTransparencyUrl,
  buildLazadaSearchUrl,
  buildSendoSearchUrl,
  buildShopeeSearchUrl,
  buildTiktokCreativeCenterUrl,
  buildTiktokSearchUrl,
  buildTikiSearchUrl,
  buildYoutubeSearchUrl,
  CHANNEL_METRIC_META,
  type ChannelMetricSource,
} from "./sales-channels";
import { buildAdLibrarySearchUrl } from "./ad-library-url";
import type { ChannelAnalysisRow, ChannelObservation } from "./channel-analysis";
import type { IndexedLanding } from "./landing";

export const PLATFORM_TAB_IDS = [
  "facebook",
  "instagram",
  "google",
  "youtube",
  "tiktok",
  "shopee",
  "lazada",
  "tiki",
  "sendo",
] as const;

export type PlatformTabId = (typeof PLATFORM_TAB_IDS)[number];

export type PlatformFamily = "ads" | "ecommerce" | "video";

export type PlatformTab = {
  id: PlatformTabId;
  labelVi: string;
  family: PlatformFamily;
  metricKind: "ads" | "sold" | "views" | "mixed";
  sources: readonly ChannelMetricSource[];
  usesFacebookAds: boolean;
  usesInstagramPlacement: boolean;
  valueLabelVi: string;
  honestyVi: string;
  researchUrl: (query: string) => string;
  autoCrawl: false;
};

export const PLATFORM_TABS: readonly PlatformTab[] = [
  {
    id: "facebook",
    labelVi: "Facebook",
    family: "ads",
    metricKind: "ads",
    sources: [],
    usesFacebookAds: true,
    usesInstagramPlacement: false,
    valueLabelVi: "Ads đã lưu / trang",
    honestyVi:
      "Chỉ thẻ Ad Library bạn đã lưu. Không có dump ads bán hàng VN. Radar không HTTP GET facebook.com.",
    researchUrl: (query) => buildAdLibrarySearchUrl(query),
    autoCrawl: false,
  },
  {
    id: "instagram",
    labelVi: "Instagram",
    family: "ads",
    metricKind: "ads",
    sources: [],
    usesFacebookAds: true,
    usesInstagramPlacement: true,
    valueLabelVi: "Thẻ có placement IG",
    honestyVi:
      "Instagram ads thương mại VN nằm trong cùng Thư viện Meta. Không có thư viện IG tách và không có engagement.",
    researchUrl: (query) => buildAdLibrarySearchUrl(query),
    autoCrawl: false,
  },
  {
    id: "google",
    labelVi: "Google",
    family: "ads",
    metricKind: "ads",
    sources: ["GOOGLE_ADS"],
    usesFacebookAds: false,
    usesInstagramPlacement: false,
    valueLabelVi: "Ads Google đã đếm",
    honestyVi:
      "Số bạn đếm trên Ads Transparency (region=VN). Không có spend / ROAS / dump commercial VN. Cấm scrape.",
    researchUrl: buildGoogleAdsTransparencyUrl,
    autoCrawl: false,
  },
  {
    id: "youtube",
    labelVi: "YouTube",
    family: "video",
    metricKind: "mixed",
    sources: ["YOUTUBE_ADS", "YOUTUBE_VIEWS"],
    usesFacebookAds: false,
    usesInstagramPlacement: false,
    valueLabelVi: "Ads đã đếm / lượt xem",
    honestyVi:
      "Lượt xem không phải đơn hàng và không vào điểm nóng. Data API chỉ lấy statistics của video ID đã có trên thẻ đã lưu — không scrape youtube.com.",
    researchUrl: buildYoutubeSearchUrl,
    autoCrawl: false,
  },
  {
    id: "tiktok",
    labelVi: "TikTok",
    family: "ecommerce",
    metricKind: "mixed",
    sources: ["TIKTOK", "TIKTOK_ADS"],
    usesFacebookAds: false,
    usesInstagramPlacement: false,
    valueLabelVi: "Đã bán Shop / ads đã đếm",
    honestyVi:
      "Đã bán = số bạn đọc trên Shop. Ads = Creative Center bạn đếm tay. Không có dump đơn / spend. Cấm scrape tiktok.com.",
    researchUrl: buildTiktokSearchUrl,
    autoCrawl: false,
  },
  {
    id: "shopee",
    labelVi: "Shopee",
    family: "ecommerce",
    metricKind: "sold",
    sources: ["SHOPEE"],
    usesFacebookAds: false,
    usesInstagramPlacement: false,
    valueLabelVi: "Đã bán (peak)",
    honestyVi: "Open Platform = shop của bạn. “Đã bán” trên listing là proxy — nhập tay, không crawl shopee.vn.",
    researchUrl: buildShopeeSearchUrl,
    autoCrawl: false,
  },
  {
    id: "lazada",
    labelVi: "Lazada",
    family: "ecommerce",
    metricKind: "sold",
    sources: ["LAZADA"],
    usesFacebookAds: false,
    usesInstagramPlacement: false,
    valueLabelVi: "Đã bán (peak)",
    honestyVi: "Không có bảng bán chạy toàn sàn cho app thứ ba. Chỉ số bạn đọc trên listing.",
    researchUrl: buildLazadaSearchUrl,
    autoCrawl: false,
  },
  {
    id: "tiki",
    labelVi: "Tiki",
    family: "ecommerce",
    metricKind: "sold",
    sources: ["TIKI"],
    usesFacebookAds: false,
    usesInstagramPlacement: false,
    valueLabelVi: "Đã bán (peak)",
    honestyVi: "Không có API đối thủ. Radar không mở tiki.vn.",
    researchUrl: buildTikiSearchUrl,
    autoCrawl: false,
  },
  {
    id: "sendo",
    labelVi: "Sendo",
    family: "ecommerce",
    metricKind: "sold",
    sources: ["SENDO"],
    usesFacebookAds: false,
    usesInstagramPlacement: false,
    valueLabelVi: "Đã bán (peak)",
    honestyVi: "Proxy nhập tay. Không crawl sendo.vn.",
    researchUrl: buildSendoSearchUrl,
    autoCrawl: false,
  },
];

function tabFamily(id: PlatformTabId): PlatformFamily {
  if (id === "youtube") {
    return "video";
  }
  if (id === "shopee" || id === "lazada" || id === "tiki" || id === "sendo") {
    return "ecommerce";
  }
  if (id === "tiktok") {
    return "ecommerce";
  }
  return "ads";
}

export function platformTab(id: PlatformTabId): PlatformTab {
  const found = PLATFORM_TABS.find((row) => row.id === id);
  if (!found) {
    throw new Error(`unknown platform ${id}`);
  }
  return { ...found, family: tabFamily(id) };
}

export function isPlatformTabId(value: string): value is PlatformTabId {
  return (PLATFORM_TAB_IDS as readonly string[]).includes(value);
}

export function parsePlatformTab(
  value: string | undefined | null,
  fallback: PlatformTabId = "facebook",
): PlatformTabId {
  const raw = value?.trim().toLowerCase() ?? "";
  return isPlatformTabId(raw) ? raw : fallback;
}

export function hasInstagramPlacement(row: ChannelAnalysisRow): boolean {
  return row.platforms.some((item) => item.toLowerCase() === "instagram");
}

export function landingKindForTab(tab: PlatformTabId): IndexedLanding | null {
  switch (tab) {
    case "shopee":
    case "lazada":
    case "tiki":
    case "sendo":
    case "youtube":
    case "tiktok":
      return tab;
    case "facebook":
    case "instagram":
    case "google":
      return null;
  }
}

export function metricSourceForTab(tab: PlatformTabId): ChannelMetricSource | null {
  switch (tab) {
    case "shopee":
      return "SHOPEE";
    case "lazada":
      return "LAZADA";
    case "tiki":
      return "TIKI";
    case "sendo":
      return "SENDO";
    case "tiktok":
      return "TIKTOK";
    case "google":
      return "GOOGLE_ADS";
    case "youtube":
      return "YOUTUBE_VIEWS";
    case "facebook":
    case "instagram":
      return null;
  }
}

export function landingUrlForTab(row: ChannelAnalysisRow, tab: PlatformTabId): string | null {
  const kind = landingKindForTab(tab);
  if (!kind) {
    return null;
  }
  return row.landingByKind[kind] ?? null;
}

/** Saved destination on the ad card — not an entered sold/views number. */
export function hasLandingPresence(row: ChannelAnalysisRow, tab: PlatformTabId): boolean {
  if (tab === "instagram") {
    return hasInstagramPlacement(row);
  }
  if (tab === "facebook" || tab === "google") {
    return false;
  }
  if (tab === "youtube" && row.youtubeVideoIds.length > 0) {
    return true;
  }
  return landingUrlForTab(row, tab) !== null;
}

export function hasPlatformData(row: ChannelAnalysisRow, tab: PlatformTabId): boolean {
  switch (tab) {
    case "facebook":
      return row.fbActiveAds > 0 || row.fbPages > 0;
    case "instagram":
      return hasInstagramPlacement(row);
    case "google":
      return row.googleAdsSeen !== null;
    case "youtube":
      return row.youtubeAdsSeen !== null || row.youtubeViews !== null;
    case "tiktok":
      return row.sold.tiktok !== null || row.tiktokAdsSeen !== null;
    case "shopee":
      return row.sold.shopee !== null;
    case "lazada":
      return row.sold.lazada !== null;
    case "tiki":
      return row.sold.tiki !== null;
    case "sendo":
      return row.sold.sendo !== null;
  }
}

export function platformSortValue(row: ChannelAnalysisRow, tab: PlatformTabId): number {
  switch (tab) {
    case "facebook":
      return row.fbHeat * 1000 + row.fbActiveAds;
    case "instagram":
      return hasInstagramPlacement(row) ? row.fbHeat * 1000 + row.fbActiveAds : 0;
    case "google":
      return row.googleAdsSeen ?? 0;
    case "youtube":
      return (row.youtubeAdsSeen ?? 0) * 1_000_000 + (row.youtubeViews ?? 0);
    case "tiktok":
      return (row.sold.tiktok ?? 0) * 1_000 + (row.tiktokAdsSeen ?? 0);
    case "shopee":
      return row.sold.shopee ?? 0;
    case "lazada":
      return row.sold.lazada ?? 0;
    case "tiki":
      return row.sold.tiki ?? 0;
    case "sendo":
      return row.sold.sendo ?? 0;
  }
}

export function rankForPlatform(
  rows: readonly ChannelAnalysisRow[],
  tab: PlatformTabId,
): ChannelAnalysisRow[] {
  return [...rows].sort((a, b) => {
    const dataA = hasPlatformData(a, tab) ? 2 : hasLandingPresence(a, tab) ? 1 : 0;
    const dataB = hasPlatformData(b, tab) ? 2 : hasLandingPresence(b, tab) ? 1 : 0;
    if (dataB !== dataA) {
      return dataB - dataA;
    }
    return (
      platformSortValue(b, tab) - platformSortValue(a, tab) ||
      a.clusterTitle.localeCompare(b.clusterTitle, "vi")
    );
  });
}

export type PlatformCoverage = {
  id: PlatformTabId;
  labelVi: string;
  family: PlatformFamily;
  productsWithData: number;
  productsWithLanding: number;
  productCount: number;
  coveragePercent: number;
  landingCoveragePercent: number;
  metricSum: number;
  lastObservedMs: number | null;
  autoCrawl: false;
  valueLabelVi: string;
};

function metricSumForTab(rows: readonly ChannelAnalysisRow[], tab: PlatformTabId): number {
  let sum = 0;
  for (const row of rows) {
    if (!hasPlatformData(row, tab)) {
      continue;
    }
    switch (tab) {
      case "facebook":
      case "instagram":
        sum += row.fbActiveAds;
        break;
      case "google":
        sum += row.googleAdsSeen ?? 0;
        break;
      case "youtube":
        sum += row.youtubeViews ?? 0;
        break;
      case "tiktok":
        sum += row.sold.tiktok ?? 0;
        break;
      case "shopee":
        sum += row.sold.shopee ?? 0;
        break;
      case "lazada":
        sum += row.sold.lazada ?? 0;
        break;
      case "tiki":
        sum += row.sold.tiki ?? 0;
        break;
      case "sendo":
        sum += row.sold.sendo ?? 0;
        break;
    }
  }
  return sum;
}

function lastObservedForTab(
  rows: readonly ChannelAnalysisRow[],
  observations: readonly ChannelObservation[],
  tab: PlatformTabId,
): number | null {
  const sources = new Set(platformTab(tab).sources);
  let max = 0;
  if (sources.size === 0) {
    for (const row of rows) {
      if (!hasPlatformData(row, tab)) {
        continue;
      }
      if (row.lastSeenMs > max) {
        max = row.lastSeenMs;
      }
    }
    return max > 0 ? max : null;
  }
  for (const row of observations) {
    if (!sources.has(row.source)) {
      continue;
    }
    if (row.observedMs > max) {
      max = row.observedMs;
    }
  }
  return max > 0 ? max : null;
}

export function buildPlatformCoverage(
  rows: readonly ChannelAnalysisRow[],
  observations: readonly ChannelObservation[],
): PlatformCoverage[] {
  const productCount = rows.length;
  return PLATFORM_TABS.map((tab) => {
    const withData = rows.filter((row) => hasPlatformData(row, tab.id)).length;
    const withLanding = rows.filter((row) => hasLandingPresence(row, tab.id)).length;
    const percent = productCount === 0 ? 0 : Math.round((withData / productCount) * 100);
    const landingPercent = productCount === 0 ? 0 : Math.round((withLanding / productCount) * 100);
    return {
      id: tab.id,
      labelVi: tab.labelVi,
      family: tabFamily(tab.id),
      productsWithData: withData,
      productsWithLanding: withLanding,
      productCount,
      coveragePercent: percent,
      landingCoveragePercent: landingPercent,
      metricSum: metricSumForTab(rows, tab.id),
      lastObservedMs: lastObservedForTab(rows, observations, tab.id),
      autoCrawl: false,
      valueLabelVi: tab.valueLabelVi,
    };
  });
}

export type ChannelTimelineRow = {
  clusterSlug: string;
  clusterTitle: string;
  source: ChannelMetricSource;
  sourceLabelVi: string;
  value: number;
  observedMs: number;
};

export function buildChannelTimeline(
  observations: readonly ChannelObservation[],
  titleBySlug: ReadonlyMap<string, string>,
  limit = 24,
): ChannelTimelineRow[] {
  return [...observations]
    .sort((a, b) => b.observedMs - a.observedMs || b.value - a.value)
    .slice(0, limit)
    .map((row) => ({
      clusterSlug: row.clusterSlug,
      clusterTitle: titleBySlug.get(row.clusterSlug) ?? row.clusterSlug,
      source: row.source,
      sourceLabelVi: CHANNEL_METRIC_META[row.source].labelVi,
      value: row.value,
      observedMs: row.observedMs,
    }));
}

export function formatObservedVi(ms: number | null | undefined, nowMs: number): string {
  if (ms == null || !Number.isFinite(ms) || ms <= 0) {
    return "chưa có số";
  }
  const ago = nowMs - ms;
  if (ago < 60_000) {
    return "vừa xong";
  }
  if (ago < 3_600_000) {
    return `${Math.floor(ago / 60_000)} phút trước`;
  }
  if (ago < 86_400_000) {
    return `${Math.floor(ago / 3_600_000)} giờ trước`;
  }
  const days = Math.floor(ago / 86_400_000);
  return `${days} ngày trước`;
}

export type CollectQueueReason = "has_landing" | "missing_metric";

export type CollectQueueItem = {
  clusterSlug: string;
  clusterTitle: string;
  nicheName: string;
  fbActiveAds: number;
  fbHeat: number;
  savedLandingUrl: string | null;
  researchUrl: string;
  source: ChannelMetricSource | null;
  reason: CollectQueueReason;
};

export function buildCollectQueue(
  rows: readonly ChannelAnalysisRow[],
  tab: PlatformTabId,
  limit = 24,
): CollectQueueItem[] {
  const source = metricSourceForTab(tab);
  const missing = rows.filter((row) => !hasPlatformData(row, tab));
  missing.sort((a, b) => {
    const landA = hasLandingPresence(a, tab) ? 1 : 0;
    const landB = hasLandingPresence(b, tab) ? 1 : 0;
    if (landB !== landA) {
      return landB - landA;
    }
    return b.fbHeat - a.fbHeat || b.fbActiveAds - a.fbActiveAds || a.clusterTitle.localeCompare(b.clusterTitle, "vi");
  });
  return missing.slice(0, limit).map((row) => ({
    clusterSlug: row.clusterSlug,
    clusterTitle: row.clusterTitle,
    nicheName: row.nicheName,
    fbActiveAds: row.fbActiveAds,
    fbHeat: row.fbHeat,
    savedLandingUrl: landingUrlForTab(row, tab),
    researchUrl: officialLinkForTab(tab, row.clusterTitle),
    source,
    reason: hasLandingPresence(row, tab) ? "has_landing" : "missing_metric",
  }));
}

export const LEGAL_FILL_PATHS = [
  {
    id: "saved_landing",
    titleVi: "Đích đã dán trên thẻ Facebook",
    detailVi: "Radar đọc URL Shopee / Lazada / Tiki / Sendo / YouTube / TikTok đã lưu — không mở sàn.",
    href: "/kenh/shopee",
  },
  {
    id: "copy_url",
    titleVi: "URL trong nội dung ads đã lưu",
    detailVi: "Nếu copy có link tiki.vn hay youtube.com, Radar nhận đích. Không bịa đã bán.",
    href: "/collect",
  },
  {
    id: "official_read",
    titleVi: "Mở trang chính thức rồi nhập số",
    detailVi: "Hàng đợi từng sản phẩm: mở listing / Transparency, đọc số, ghi vào kho.",
    href: "/tong-hop",
  },
  {
    id: "sheet",
    titleVi: "Sheet CSV nhiều dòng",
    detailVi: "Cột tikiSold, sendoSold, googleAdsSeen, youtubeViews… Tối đa 200 dòng/lần.",
    href: "/collect",
  },
  {
    id: "licensed",
    titleVi: "Feed JSON đã mua",
    detailVi: "File hoặc HTTPS vendor. Cấm trỏ vào Shopee / YouTube / Transparency.",
    href: "/collect",
  },
  {
    id: "youtube_api",
    titleVi: "YouTube Data API — video đã có ID",
    detailVi: "Lượt xem công khai của video trên thẻ đã lưu. Không vào điểm nóng. Không scrape youtube.com.",
    href: "/kenh/youtube",
  },
  {
    id: "youtube_search",
    titleVi: "YouTube search.list theo tên cụm",
    detailVi: "Tìm video công khai + view. Hạn ngạch 100 đơn vị/lần tìm. Không vào điểm nóng.",
    href: "/kenh/youtube",
  },
  {
    id: "google_cse",
    titleVi: "Google Custom Search — URL Tiki/Shopee/Lazada",
    detailVi: "Tăng cột “có đích”. Không lấy đã bán. Không mở HTML sàn.",
    href: "/kenh/tiki",
  },
  {
    id: "own_ads",
    titleVi: "Ads / shop Open API của bạn",
    detailVi: "Marketing API, Shopee/Lazada/TikTok Shop Open. Không trộn vào HeatScore thị trường.",
    href: "/own-ads",
  },
] as const;

export type PlatformDashboard = {
  tab: PlatformTab;
  recomputedMs: number;
  autoCrawl: false;
  nationalDump: false;
  coverage: PlatformCoverage[];
  ranked: ChannelAnalysisRow[];
  withDataCount: number;
  landingCount: number;
  missingCount: number;
  youtubeVideoCount: number;
  queue: CollectQueueItem[];
  metricSource: ChannelMetricSource | null;
  timeline: ChannelTimelineRow[];
  sampleResearchUrl: string;
};

export function buildPlatformDashboard(input: {
  rows: readonly ChannelAnalysisRow[];
  observations: readonly ChannelObservation[];
  tab: PlatformTabId;
  nowMs: number;
  titleBySlug: ReadonlyMap<string, string>;
  timelineLimit?: number;
}): PlatformDashboard {
  const tab = platformTab(input.tab);
  const ranked = rankForPlatform(input.rows, input.tab);
  const withDataCount = ranked.filter((row) => hasPlatformData(row, input.tab)).length;
  const landingCount = ranked.filter((row) => hasLandingPresence(row, input.tab)).length;
  return {
    tab,
    recomputedMs: input.nowMs,
    autoCrawl: false,
    nationalDump: false,
    coverage: buildPlatformCoverage(input.rows, input.observations),
    ranked,
    withDataCount,
    landingCount,
    missingCount: ranked.length - withDataCount,
    youtubeVideoCount: ranked.reduce((sum, row) => sum + row.youtubeVideoIds.length, 0),
    queue: buildCollectQueue(ranked, input.tab),
    metricSource: metricSourceForTab(input.tab),
    timeline: buildChannelTimeline(input.observations, input.titleBySlug, input.timelineLimit ?? 24),
    sampleResearchUrl: tab.researchUrl("serum"),
  };
}

export function platformHref(
  tab: PlatformTabId,
  opts: { base?: "home" | "kenh" | "top" | "trend"; niche?: string; extra?: Record<string, string | undefined> } = {},
): string {
  const niche = opts.niche?.trim();
  if (opts.base === "trend") {
    const params = new URLSearchParams();
    params.set("kenh", tab);
    if (niche) {
      params.set("niche", niche);
    }
    for (const [key, value] of Object.entries(opts.extra ?? {})) {
      if (value?.trim() && key !== "kenh" && key !== "tab") {
        params.set(key, value.trim());
      }
    }
    return `/xu-huong?${params.toString()}`;
  }
  if (opts.base === "top") {
    const params = new URLSearchParams();
    if (niche) {
      params.set("niche", niche);
    }
    for (const [key, value] of Object.entries(opts.extra ?? {})) {
      if (value?.trim() && key !== "kenh" && key !== "tab") {
        params.set(key, value.trim());
      }
    }
    const query = params.toString();
    return query ? `/top/${tab}?${query}` : `/top/${tab}`;
  }
  if (opts.base === "kenh" || opts.base === undefined) {
    const params = new URLSearchParams();
    if (niche) {
      params.set("niche", niche);
    }
    for (const [key, value] of Object.entries(opts.extra ?? {})) {
      if (value?.trim()) {
        params.set(key, value.trim());
      }
    }
    const query = params.toString();
    return query ? `/kenh/${tab}?${query}` : `/kenh/${tab}`;
  }
  const params = new URLSearchParams();
  params.set("kenh", tab);
  if (niche) {
    params.set("niche", niche);
  }
  for (const [key, value] of Object.entries(opts.extra ?? {})) {
    if (value?.trim() && key !== "kenh") {
      params.set(key, value.trim());
    }
  }
  return `/?${params.toString()}`;
}

export function officialLinkForTab(tab: PlatformTabId, query: string): string {
  if (tab === "tiktok") {
    return buildTiktokCreativeCenterUrl();
  }
  return platformTab(tab).researchUrl(query);
}

export function serializePlatformTabs(): Array<{
  id: PlatformTabId;
  labelVi: string;
  family: PlatformFamily;
  valueLabelVi: string;
  honestyVi: string;
  autoCrawl: false;
}> {
  return PLATFORM_TABS.map((row) => ({
    id: row.id,
    labelVi: row.labelVi,
    family: tabFamily(row.id),
    valueLabelVi: row.valueLabelVi,
    honestyVi: row.honestyVi,
    autoCrawl: false,
  }));
}
