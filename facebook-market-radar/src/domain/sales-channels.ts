import { buildAdLibrarySearchUrl } from "./ad-library-url";

/** Legal sales / ad-research channels. None are scraped. Server never HTTP-GETs these hosts. */

export const CHANNEL_METRIC_KINDS = ["sold", "ads_seen", "views"] as const;
export type ChannelMetricKind = (typeof CHANNEL_METRIC_KINDS)[number];

export const CHANNEL_METRIC_SOURCES = [
  "SHOPEE",
  "TIKTOK",
  "LAZADA",
  "TIKI",
  "SENDO",
  "GOOGLE_ADS",
  "YOUTUBE_ADS",
  "TIKTOK_ADS",
  "YOUTUBE_VIEWS",
] as const;
export type ChannelMetricSource = (typeof CHANNEL_METRIC_SOURCES)[number];

export const SOLD_METRIC_SOURCES = ["SHOPEE", "TIKTOK", "LAZADA", "TIKI", "SENDO"] as const;
export type SoldMetricSource = (typeof SOLD_METRIC_SOURCES)[number];

export type SalesChannelFamily =
  | "ad_transparency"
  | "ecommerce"
  | "search_demand"
  | "own_account"
  | "blocked";

export type SalesChannel = {
  id: string;
  family: SalesChannelFamily;
  nameVi: string;
  officialHost: string;
  researchUrl: (query: string) => string;
  ingest: "user_count" | "own_api" | "url_only" | "blocked";
  metrics: readonly string[];
  missing: readonly string[];
  notesVi: string;
};

function q(query: string): string {
  return encodeURIComponent(query.trim());
}

export function buildGoogleAdsTransparencyUrl(query: string): string {
  const text = query.trim();
  const params = new URLSearchParams({ region: "VN" });
  if (text) {
    params.set("q", text);
  }
  return `https://adstransparency.google.com/?${params.toString()}`;
}

export function buildYoutubeSearchUrl(query: string): string {
  return `https://www.youtube.com/results?search_query=${q(query)}`;
}

export function buildTiktokCreativeCenterUrl(): string {
  return "https://ads.tiktok.com/business/creativecenter/inspiration/topads/pc/en?region=VN";
}

export function buildTiktokSearchUrl(query: string): string {
  return `https://www.tiktok.com/search?q=${q(query)}`;
}

export function buildShopeeSearchUrl(query: string): string {
  return `https://shopee.vn/search?keyword=${q(query)}`;
}

export function buildLazadaSearchUrl(query: string): string {
  return `https://www.lazada.vn/catalog/?q=${q(query)}`;
}

export function buildTikiSearchUrl(query: string): string {
  return `https://tiki.vn/search?q=${q(query)}`;
}

export function buildSendoSearchUrl(query: string): string {
  return `https://www.sendo.vn/tim-kiem?q=${q(query)}`;
}

export function buildGoogleTrendsUrl(query: string): string {
  return `https://trends.google.com/trends/explore?geo=VN&q=${q(query)}`;
}

export function buildGoogleShoppingUrl(query: string): string {
  const params = new URLSearchParams({ tbm: "shop", gl: "vn", hl: "vi", q: query.trim() });
  return `https://www.google.com/search?${params.toString()}`;
}

export const SALES_CHANNELS: readonly SalesChannel[] = [
  {
    id: "meta_ad_library",
    family: "ad_transparency",
    nameVi: "Thư viện quảng cáo Meta (FB/IG)",
    officialHost: "facebook.com/ads/library",
    researchUrl: (query) => buildAdLibrarySearchUrl(query),
    ingest: "user_count",
    metrics: ["ads đang chạy đã lưu", "số page", "ngày bắt đầu", "creative"],
    missing: ["spend", "ROAS", "đơn Facebook", "dump toàn quốc"],
    notesVi: "Nguồn ads thương mại VN đầy đủ nhất trên web. Radar chỉ sinh URL; user lưu thẻ.",
  },
  {
    id: "google_ads_transparency",
    family: "ad_transparency",
    nameVi: "Google Ads Transparency (Search / Display / YouTube)",
    officialHost: "adstransparency.google.com",
    researchUrl: buildGoogleAdsTransparencyUrl,
    ingest: "user_count",
    metrics: ["creative Google/YouTube user đếm tay", "advertiser / domain"],
    missing: ["spend", "chuyển đổi", "ROAS", "API dump commercial VN"],
    notesVi:
      "Kho chính thức của Google cho ads đã chạy trên Search, Display, Gmail, YouTube. Lọc region=VN. API Transparency chỉ EEA/một số nước luật — không phải kho bán hàng VN. Cấm Apify/SerpAPI scrape.",
  },
  {
    id: "youtube_public",
    family: "search_demand",
    nameVi: "YouTube (tìm video công khai)",
    officialHost: "youtube.com",
    researchUrl: buildYoutubeSearchUrl,
    ingest: "user_count",
    metrics: ["lượt xem video user nhập"],
    missing: ["doanh số", "ads spend", "Analytics đối thủ"],
    notesVi:
      "YouTube Data API chỉ số video công khai nếu có ID — không phải đơn hàng. Analytics / ads = kênh của bạn. Radar không gọi YouTube.",
  },
  {
    id: "tiktok_creative_center",
    family: "ad_transparency",
    nameVi: "TikTok Creative Center — Top Ads",
    officialHost: "ads.tiktok.com/business/creativecenter",
    researchUrl: () => buildTiktokCreativeCenterUrl(),
    ingest: "url_only",
    metrics: ["top ads đã chọn bởi TikTok", "nhãn hiệu suất khoảng"],
    missing: ["mọi ads đang chạy", "spend chính xác", "API public", "đơn Shop"],
    notesVi: "Chỉ mẫu top, không phải thư viện đủ. Commercial Content Library chủ yếu EEA/UK. Cấm scrape.",
  },
  {
    id: "shopee_public",
    family: "ecommerce",
    nameVi: "Shopee VN (trang sản phẩm)",
    officialHost: "shopee.vn",
    researchUrl: buildShopeeSearchUrl,
    ingest: "user_count",
    metrics: ["đã bán user đọc rồi nhập"],
    missing: ["API đối thủ", "GMV", "ads Shopee dump"],
    notesVi: "Open Platform = shop của bạn. Số “đã bán” trên listing là proxy — nhập tay, không crawl.",
  },
  {
    id: "tiktok_shop",
    family: "ecommerce",
    nameVi: "TikTok Shop / tìm TikTok",
    officialHost: "tiktok.com",
    researchUrl: buildTiktokSearchUrl,
    ingest: "user_count",
    metrics: ["đã bán user nhập"],
    missing: ["Seller Center đối thủ", "dump đơn"],
    notesVi: "Seller API chỉ shop mình. Radar không mở tiktok.com.",
  },
  {
    id: "lazada_public",
    family: "ecommerce",
    nameVi: "Lazada VN",
    officialHost: "lazada.vn",
    researchUrl: buildLazadaSearchUrl,
    ingest: "user_count",
    metrics: ["đã bán user nhập"],
    missing: ["Open Platform đối thủ", "GMV"],
    notesVi: "Open Platform = seller của bạn. Không có bảng bán chạy toàn sàn cho app thứ ba.",
  },
  {
    id: "tiki_public",
    family: "ecommerce",
    nameVi: "Tiki",
    officialHost: "tiki.vn",
    researchUrl: buildTikiSearchUrl,
    ingest: "user_count",
    metrics: ["đã bán user nhập"],
    missing: ["API đối thủ"],
    notesVi: "Chỉ nhập số bạn đọc trên listing. Không crawl.",
  },
  {
    id: "sendo_public",
    family: "ecommerce",
    nameVi: "Sendo",
    officialHost: "sendo.vn",
    researchUrl: buildSendoSearchUrl,
    ingest: "user_count",
    metrics: ["đã bán user nhập"],
    missing: ["API đối thủ"],
    notesVi: "Proxy nhập tay.",
  },
  {
    id: "google_trends",
    family: "search_demand",
    nameVi: "Google Trends (VN)",
    officialHost: "trends.google.com",
    researchUrl: buildGoogleTrendsUrl,
    ingest: "url_only",
    metrics: ["mức độ tìm kiếm tương đối"],
    missing: ["doanh số", "ads", "số tuyệt đối"],
    notesVi: "Nhu cầu tìm kiếm, không phải bán được. User tự mở; Radar không kéo Trends.",
  },
  {
    id: "google_shopping",
    family: "ecommerce",
    nameVi: "Google Shopping",
    officialHost: "google.com/search?tbm=shop",
    researchUrl: buildGoogleShoppingUrl,
    ingest: "url_only",
    metrics: ["listing giá công khai"],
    missing: ["đơn hàng", "ads spend"],
    notesVi: "Merchant Center = catalog của bạn. Không có GMV đối thủ.",
  },
  {
    id: "own_ads_accounts",
    family: "own_account",
    nameVi: "Ads / shop của chính bạn",
    officialHost: "(token user)",
    researchUrl: () => "/own-ads",
    ingest: "own_api",
    metrics: ["spend, impression, purchase, ROAS của bạn"],
    missing: ["số đối thủ"],
    notesVi: "Google Ads / YouTube / TikTok / Shopee API của tài khoản bạn. Cấm trộn vào bảng thị trường.",
  },
  {
    id: "blocked_scrapers",
    family: "blocked",
    nameVi: "Scraper Apify / SerpAPI / crawl sàn",
    officialHost: "—",
    researchUrl: () => "/nguon",
    ingest: "blocked",
    metrics: [],
    missing: ["mọi số hợp pháp"],
    notesVi: "Cấm HTTP GET facebook, adstransparency, youtube, shopee, lazada, tiki, tiktok để xếp hạng.",
  },
];

export const CHANNEL_METRIC_META: Record<
  ChannelMetricSource,
  { kind: ChannelMetricKind; labelVi: string; estimated: true }
> = {
  SHOPEE: { kind: "sold", labelVi: "Đã bán Shopee", estimated: true },
  TIKTOK: { kind: "sold", labelVi: "Đã bán TikTok Shop", estimated: true },
  LAZADA: { kind: "sold", labelVi: "Đã bán Lazada", estimated: true },
  TIKI: { kind: "sold", labelVi: "Đã bán Tiki", estimated: true },
  SENDO: { kind: "sold", labelVi: "Đã bán Sendo", estimated: true },
  GOOGLE_ADS: { kind: "ads_seen", labelVi: "Ads Google đã đếm", estimated: true },
  YOUTUBE_ADS: { kind: "ads_seen", labelVi: "Ads YouTube đã đếm", estimated: true },
  TIKTOK_ADS: { kind: "ads_seen", labelVi: "Ads TikTok đã đếm", estimated: true },
  YOUTUBE_VIEWS: { kind: "views", labelVi: "Lượt xem YouTube (không phải đơn)", estimated: true },
};

export function isChannelMetricSource(value: string): value is ChannelMetricSource {
  return (CHANNEL_METRIC_SOURCES as readonly string[]).includes(value);
}

export function isSoldMetricSource(value: string): value is SoldMetricSource {
  return (SOLD_METRIC_SOURCES as readonly string[]).includes(value);
}

export function parseChannelMetricSource(value: string): ChannelMetricSource | null {
  const upper = value.trim().toUpperCase();
  return isChannelMetricSource(upper) ? upper : null;
}

export const CHANNEL_FAMILY_VI: Record<SalesChannelFamily, string> = {
  ad_transparency: "Thư viện quảng cáo / minh bạch",
  ecommerce: "Sàn thương mại điện tử",
  search_demand: "Nhu cầu tìm kiếm / video",
  own_account: "Tài khoản của bạn",
  blocked: "Cấm",
};

export type OfficialResearchLinks = {
  metaAdLibrary: string;
  googleAds: string;
  youtube: string;
  tiktokTopAds: string;
  tiktokSearch: string;
  shopee: string;
  lazada: string;
  tiki: string;
  sendo: string;
  trends: string;
  shopping: string;
};

export function officialResearchLinks(query: string): OfficialResearchLinks {
  const text = query.trim() || " ";
  return {
    metaAdLibrary: buildAdLibrarySearchUrl(text.trim() || "san pham"),
    googleAds: buildGoogleAdsTransparencyUrl(text),
    youtube: buildYoutubeSearchUrl(text),
    tiktokTopAds: buildTiktokCreativeCenterUrl(),
    tiktokSearch: buildTiktokSearchUrl(text),
    shopee: buildShopeeSearchUrl(text),
    lazada: buildLazadaSearchUrl(text),
    tiki: buildTikiSearchUrl(text),
    sendo: buildSendoSearchUrl(text),
    trends: buildGoogleTrendsUrl(text),
    shopping: buildGoogleShoppingUrl(text),
  };
}

export function serializeSalesChannels(): Array<{
  id: string;
  family: SalesChannelFamily;
  nameVi: string;
  officialHost: string;
  ingest: SalesChannel["ingest"];
  metrics: string[];
  missing: string[];
  notesVi: string;
  sampleUrl: string;
}> {
  return SALES_CHANNELS.map((row) => ({
    id: row.id,
    family: row.family,
    nameVi: row.nameVi,
    officialHost: row.officialHost,
    ingest: row.ingest,
    metrics: [...row.metrics],
    missing: [...row.missing],
    notesVi: row.notesVi,
    sampleUrl: row.researchUrl("serum"),
  }));
}

export const CHANNEL_SORTS = ["ads", "sold", "tong"] as const;
export type ChannelSort = (typeof CHANNEL_SORTS)[number];

export function parseChannelSort(value: string | undefined): ChannelSort {
  return value === "sold" || value === "tong" || value === "ads" ? value : "tong";
}
