export const OFFICIAL_API_SCOPES = ["market_public", "own_account", "human_only", "blocked"] as const;
export type OfficialApiScope = (typeof OFFICIAL_API_SCOPES)[number];

export const OFFICIAL_API_STATUSES = ["wired", "mapped", "blocked"] as const;
export type OfficialApiStatus = (typeof OFFICIAL_API_STATUSES)[number];

export type OfficialPlatformApi = {
  id: string;
  platform: string;
  nameVi: string;
  host: string;
  scope: OfficialApiScope;
  status: OfficialApiStatus;
  heatScore: false;
  competitorSold: false;
  provides: readonly string[];
  missing: readonly string[];
  envKeys: readonly string[];
  ingestPath: string;
  notesVi: string;
};

/**
 * Every realistic official API / legal path for platform product stats.
 * competitorSold is always false — no public GMV dump for VN marketplaces.
 */
export const OFFICIAL_PLATFORM_APIS: readonly OfficialPlatformApi[] = [
  {
    id: "youtube_videos_list",
    platform: "youtube",
    nameVi: "YouTube Data API — videos.list",
    host: "www.googleapis.com/youtube/v3/videos",
    scope: "market_public",
    status: "wired",
    heatScore: false,
    competitorSold: false,
    provides: ["viewCount công khai của video ID đã có trên kho"],
    missing: ["doanh số", "ads spend", "Analytics kênh người khác"],
    envKeys: ["YOUTUBE_API_KEY"],
    ingestPath: "POST /api/youtube-views + POST /api/platform-stats",
    notesVi: "Chỉ googleapis.com. ID lấy từ thẻ / link nghiên cứu đã lưu. Views không vào HeatScore.",
  },
  {
    id: "youtube_search_list",
    platform: "youtube",
    nameVi: "YouTube Data API — search.list",
    host: "www.googleapis.com/youtube/v3/search",
    scope: "market_public",
    status: "wired",
    heatScore: false,
    competitorSold: false,
    provides: ["video công khai theo tiêu đề cụm đã lưu", "viewCount sau videos.list"],
    missing: ["đơn hàng", "đảm bảo video đúng SKU", "quota lớn (100 đơn vị/lần tìm)"],
    envKeys: ["YOUTUBE_API_KEY"],
    ingestPath: "POST /api/platform-stats { action: youtube_search }",
    notesVi:
      "Tìm video theo title cụm thiếu view — tối đa vài cụm/lần vì hạn ngạch. Lưu URL watch + view. Không scrape youtube.com.",
  },
  {
    id: "google_cse_listings",
    platform: "google",
    nameVi: "Google Custom Search — link listing chính thức",
    host: "www.googleapis.com/customsearch/v1",
    scope: "market_public",
    status: "wired",
    heatScore: false,
    competitorSold: false,
    provides: ["URL tiki.vn / shopee.vn / lazada.vn / sendo.vn khớp title cụm"],
    missing: ["đã bán", "GMV", "thứ hạng bán chạy toàn sàn"],
    envKeys: ["GOOGLE_CSE_KEY", "GOOGLE_CSE_CX"],
    ingestPath: "POST /api/platform-stats { action: listing_search }",
    notesVi:
      "Tăng cột “có đích”, không bịa đã bán. Server không mở HTML sàn — chỉ nhận URL CSE trả về nếu host khớp.",
  },
  {
    id: "meta_marketing_own",
    platform: "facebook",
    nameVi: "Meta Marketing API — ads của tôi",
    host: "graph.facebook.com",
    scope: "own_account",
    status: "wired",
    heatScore: false,
    competitorSold: false,
    provides: ["spend, impression, purchase của ad account đã cấp token"],
    missing: ["ads đối thủ", "ngành hàng thị trường"],
    envKeys: ["META_ACCESS_TOKEN", "META_AD_ACCOUNT_ID"],
    ingestPath: "POST /api/own-ads/sync",
    notesVi: "Không trộn vào HeatScore / bảng /kenh thị trường.",
  },
  {
    id: "shopee_open_own",
    platform: "shopee",
    nameVi: "Shopee Open Platform — shop của tôi",
    host: "partner.shopeemobile.com",
    scope: "own_account",
    status: "wired",
    heatScore: false,
    competitorSold: false,
    provides: ["item + sold của shop đã ủy quyền"],
    missing: ["đã bán đối thủ", "bảng bán chạy toàn quốc"],
    envKeys: ["SHOPEE_PARTNER_ID", "SHOPEE_PARTNER_KEY", "SHOPEE_SHOP_ID", "SHOPEE_ACCESS_TOKEN"],
    ingestPath: "POST /api/platform-stats { action: own_shop }",
    notesVi: "HMAC partner chính thức. Lưu own_shop_daily — không ghi sales_proxy thị trường.",
  },
  {
    id: "lazada_open_own",
    platform: "lazada",
    nameVi: "Lazada Open Platform — shop của tôi",
    host: "api.lazada.vn",
    scope: "own_account",
    status: "wired",
    heatScore: false,
    competitorSold: false,
    provides: ["SKU shop đã ủy quyền"],
    missing: ["đã bán đối thủ"],
    envKeys: ["LAZADA_APP_KEY", "LAZADA_APP_SECRET", "LAZADA_ACCESS_TOKEN"],
    ingestPath: "POST /api/platform-stats { action: own_shop }",
    notesVi: "Chỉ api.lazada.vn|com /rest. Không GET lazada.vn HTML.",
  },
  {
    id: "tiktok_shop_own",
    platform: "tiktok",
    nameVi: "TikTok Shop Open API — shop của tôi",
    host: "open-api.tiktokglobalshop.com",
    scope: "own_account",
    status: "wired",
    heatScore: false,
    competitorSold: false,
    provides: ["sản phẩm shop đã ủy quyền"],
    missing: ["GMV đối thủ", "mọi ads Creative Center"],
    envKeys: ["TIKTOK_SHOP_APP_KEY", "TIKTOK_SHOP_APP_SECRET", "TIKTOK_SHOP_ACCESS_TOKEN", "TIKTOK_SHOP_ID"],
    ingestPath: "POST /api/platform-stats { action: own_shop }",
    notesVi: "Partner host. Không scrape tiktok.com.",
  },
  {
    id: "tiki_seller_own",
    platform: "tiki",
    nameVi: "Tiki Seller API (nếu có hợp đồng)",
    host: "seller portal / hợp đồng Tiki",
    scope: "own_account",
    status: "mapped",
    heatScore: false,
    competitorSold: false,
    provides: ["SKU của gian hàng mình nếu Tiki cấp"],
    missing: ["API công khai đã bán đối thủ", "dump bestseller toàn quốc"],
    envKeys: [],
    ingestPath: "/collect + hàng đợi /kenh/tiki",
    notesVi:
      "Không có API công khai “đã bán” listing người khác. Radar không gọi tiki.vn JSON ẩn — đó vẫn là scrape.",
  },
  {
    id: "sendo_seller",
    platform: "sendo",
    nameVi: "Sendo — không có dump thống kê công khai",
    host: "—",
    scope: "human_only",
    status: "mapped",
    heatScore: false,
    competitorSold: false,
    provides: [],
    missing: ["API sold đối thủ", "Open Platform ổn định"],
    envKeys: [],
    ingestPath: "/kenh/sendo hàng đợi + CSE đích",
    notesVi: "User mở listing chính thức rồi nhập. CSE chỉ lấy URL, không lấy đã bán.",
  },
  {
    id: "google_ads_transparency_api",
    platform: "google",
    nameVi: "Google Ads Transparency API",
    host: "adstransparency.google.com",
    scope: "blocked",
    status: "blocked",
    heatScore: false,
    competitorSold: false,
    provides: ["creative EEA / một số vùng"],
    missing: ["dump commercial VN", "spend", "chuyển đổi"],
    envKeys: [],
    ingestPath: "không gọi như kho bán hàng VN",
    notesVi: "Không phải bảng sản phẩm bán chạy Việt Nam. User đếm tay trên trang chính thức.",
  },
  {
    id: "meta_ads_archive",
    platform: "facebook",
    nameVi: "Graph /ads_archive",
    host: "graph.facebook.com",
    scope: "blocked",
    status: "blocked",
    heatScore: false,
    competitorSold: false,
    provides: ["ads chính trị / reach EU"],
    missing: ["ads bán hàng chỉ chạy VN"],
    envKeys: [],
    ingestPath: "không gọi",
    notesVi: "Không phải kho thương mại VN. Giữ blocked.",
  },
  {
    id: "licensed_https_feed",
    platform: "all",
    nameVi: "Feed HTTPS vendor đã mua",
    host: "vendor (không phải sàn)",
    scope: "market_public",
    status: "wired",
    heatScore: false,
    competitorSold: false,
    provides: ["ads NormalizedAd nếu hợp đồng cho phép"],
    missing: ["GMV sàn nếu vendor không bán"],
    envKeys: ["FMR_LICENSED_FEED_URL", "FMR_LICENSED_FEED_TOKEN"],
    ingestPath: "POST /api/licensed/import",
    notesVi: "Cấm trỏ licensed-host vào shopee.vn / tiki.vn / youtube.com / Transparency.",
  },
  {
    id: "user_typed_metrics",
    platform: "all",
    nameVi: "User nhập / CSV / hàng đợi",
    host: "không gọi ngoài",
    scope: "human_only",
    status: "wired",
    heatScore: false,
    competitorSold: false,
    provides: ["đã bán / ads-seen / views do người đọc trang chính thức"],
    missing: ["tự kéo số từ HTML"],
    envKeys: ["FMR_COLLECT_KEY"],
    ingestPath: "POST /api/kenh + /collect + sheet",
    notesVi: "Đây vẫn là đường sold thị trường hợp pháp duy nhất. Sold sàn mới vào HeatScore.",
  },
];

export function officialApiById(id: string): OfficialPlatformApi | undefined {
  return OFFICIAL_PLATFORM_APIS.find((row) => row.id === id);
}

export function wiredOfficialApiIds(): string[] {
  return OFFICIAL_PLATFORM_APIS.filter((row) => row.status === "wired").map((row) => row.id);
}

export function blockedOfficialApiIds(): string[] {
  return OFFICIAL_PLATFORM_APIS.filter((row) => row.status === "blocked").map((row) => row.id);
}

export function ownAccountOfficialApiIds(): string[] {
  return OFFICIAL_PLATFORM_APIS.filter((row) => row.scope === "own_account").map((row) => row.id);
}
