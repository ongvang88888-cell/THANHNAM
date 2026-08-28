export const SOURCE_FAMILIES = [
  "official_meta",
  "user_capture",
  "licensed_vendor",
  "own_account",
  "blocked",
] as const;
export type SourceFamily = (typeof SOURCE_FAMILIES)[number];

export const SOURCE_STATUSES = ["wired", "mapped", "blocked"] as const;
export type SourceStatus = (typeof SOURCE_STATUSES)[number];

export const VN_COMMERCIAL = ["yes", "human_only", "if_licensed", "no"] as const;
export type VnCommercial = (typeof VN_COMMERCIAL)[number];

export const RADAR_PORTS = ["manual", "licensed", "own_ads", "none"] as const;
export type RadarPort = (typeof RADAR_PORTS)[number];

export type DataSource = {
  id: string;
  family: SourceFamily;
  nameVi: string;
  nameEn: string;
  status: SourceStatus;
  vnCommercial: VnCommercial;
  radarPort: RadarPort;
  ingestPath: string;
  provides: readonly string[];
  missing: readonly string[];
  notesVi: string;
};

/**
 * Catalog of every realistic path to Facebook-ad / industry / product data.
 * Wired = Radar can sync today. Mapped = legal if the user has a contract/export.
 * Blocked = must not be implemented (scrape, CASD dump, competitor ROAS).
 */
export const DATA_SOURCES: readonly DataSource[] = [
  {
    id: "meta_ad_library_ui",
    family: "official_meta",
    nameVi: "Thư viện quảng cáo Meta (trình duyệt)",
    nameEn: "Meta Ad Library website",
    status: "wired",
    vnCommercial: "human_only",
    radarPort: "manual",
    ingestPath: "/collect + /quet",
    provides: ["libraryId", "page", "copy", "startDate", "active", "platforms", "snapshot URL"],
    missing: ["spend", "ROAS", "CPA", "impressions thương mại VN", "doanh số đối thủ"],
    notesVi:
      "Nguồn công khai đầy đủ nhất cho ads bán hàng VN đang chạy. User mở URL chính thức (country=VN, active), rồi lưu thẻ. Server không HTTP GET facebook.com.",
  },
  {
    id: "meta_page_transparency",
    family: "official_meta",
    nameVi: "Page Transparency → Ads của trang",
    nameEn: "Facebook Page Transparency ads tab",
    status: "wired",
    vnCommercial: "human_only",
    radarPort: "manual",
    ingestPath: "/collect + /theo-doi",
    provides: ["ads đang chạy của một Page", "pageId"],
    missing: ["toàn bộ ngành", "spend thương mại"],
    notesVi: "Từ trang đối thủ: Giới thiệu → Tính minh bạch → Thư viện quảng cáo. Lưu từng thẻ; Watch Page chỉ cảnh báo khi user lưu thẻ mới.",
  },
  {
    id: "meta_instagram_ad_library",
    family: "official_meta",
    nameVi: "Ads Instagram trong cùng Thư viện Meta",
    nameEn: "Instagram placements in Meta Ad Library",
    status: "wired",
    vnCommercial: "human_only",
    radarPort: "manual",
    ingestPath: "/collect (platforms)",
    provides: ["placement Instagram nếu thẻ hiện trên Thư viện"],
    missing: ["Thư viện Instagram tách riêng", "engagement"],
    notesVi: "Instagram ads thương mại VN cũng xem trong facebook.com/ads/library, không có API dump riêng.",
  },
  {
    id: "meta_ads_archive_api",
    family: "official_meta",
    nameVi: "Graph API /ads_archive (Ad Library API)",
    nameEn: "Ads Archive API",
    status: "blocked",
    vnCommercial: "no",
    radarPort: "none",
    ingestPath: "không gọi",
    provides: [
      "ads chính trị/vấn đề toàn cầu (7 năm)",
      "mọi loại ads đã reach EU/UK (~1 năm)",
      "id, page, copy, ngày chạy, snapshot URL",
      "spend/impression dạng khoảng — chỉ ads chính trị",
    ],
    missing: ["ads bán hàng chỉ chạy VN/US/APAC", "ROAS", "đơn hàng"],
    notesVi:
      "Tài liệu Meta (v26 ads_archive): ads không reach EU chỉ trả về nếu là social issues / elections / politics. ad_reached_countries=['VN'] không cho kho thương mại VN. Radar không gọi endpoint này.",
  },
  {
    id: "meta_ad_library_report",
    family: "official_meta",
    nameVi: "Ad Library Report (CSV chính trị)",
    nameEn: "Ad Library Report",
    status: "blocked",
    vnCommercial: "no",
    radarPort: "none",
    ingestPath: "không nhập",
    provides: ["tổng spend ads chính trị/vấn đề theo nước, nhà quảng cáo"],
    missing: ["serum, bỉm, gadget", "creative", "sản phẩm"],
    notesVi: "facebook.com/ads/library/report — chỉ ads về social issues / elections / politics. Không dùng xếp hạng ngành hàng.",
  },
  {
    id: "meta_content_library_casd",
    family: "official_meta",
    nameVi: "Meta Content Library / CASD",
    nameEn: "Meta Content Library API",
    status: "blocked",
    vnCommercial: "no",
    radarPort: "none",
    ingestPath: "ngoài phạm vi",
    provides: ["kho nội dung công khai cho nghiên cứu học thuật"],
    missing: ["quyền dùng thương mại", "xuất raw ads vào SaaS"],
    notesVi:
      "Chỉ tổ chức học thuật / nghiên cứu phi lợi nhuận, CASD duyệt. Điều khoản cấm khai thác thương mại. Không dump vào kho Radar.",
  },
  {
    id: "meta_pages_graph",
    family: "official_meta",
    nameVi: "Graph API Pages (metadata trang)",
    nameEn: "Pages API",
    status: "blocked",
    vnCommercial: "no",
    radarPort: "none",
    ingestPath: "không gọi",
    provides: ["tên trang, fan count nếu app được cấp quyền"],
    missing: ["ads đang chạy", "ngành hàng"],
    notesVi: "Không phải Ad Library. Không dùng để lấy bài ads đối thủ.",
  },
  {
    id: "crowd_tangle",
    family: "official_meta",
    nameVi: "CrowdTangle (đã tắt)",
    nameEn: "CrowdTangle",
    status: "blocked",
    vnCommercial: "no",
    radarPort: "none",
    ingestPath: "không còn",
    provides: [],
    missing: ["mọi thứ — sản phẩm đã sunset"],
    notesVi: "Meta đã đóng CrowdTangle. Không còn cổng đồng bộ.",
  },
  {
    id: "eu_dsa_transparency",
    family: "official_meta",
    nameVi: "Kho ads EU (DSA) qua /ads_archive",
    nameEn: "EU DSA ad transparency",
    status: "blocked",
    vnCommercial: "no",
    radarPort: "none",
    ingestPath: "không gọi",
    provides: ["ads thương mại đã reach EU/UK"],
    missing: ["thị trường VN"],
    notesVi: "Có thể có brand global cũng bán VN, nhưng đây là ads đã reach EU — không phải kho ngành hàng Việt Nam.",
  },
  {
    id: "collect_manual",
    family: "user_capture",
    nameVi: "Form / JSON snapshot do user dán",
    nameEn: "Manual collect",
    status: "wired",
    vnCommercial: "yes",
    radarPort: "manual",
    ingestPath: "POST /api/collect",
    provides: ["NormalizedAd + productTitle + niche + giá/sold user nhập"],
    missing: ["tự kéo Facebook"],
    notesVi: "Cổng chuẩn. Idempotent theo libraryId. Cần x-fmr-key khi đã set FMR_COLLECT_KEY.",
  },
  {
    id: "collect_sheet",
    family: "user_capture",
    nameVi: "CSV / Google Sheet xuất ra",
    nameEn: "Ad Library sheet",
    status: "wired",
    vnCommercial: "yes",
    radarPort: "manual",
    ingestPath: "POST /api/collect/sheet",
    provides: ["nhiều thẻ / tuần", "nicheSlug 26 ngành"],
    missing: ["ảnh trừ khi cột có URL"],
    notesVi: "Xuất Google Sheets thành CSV (mẫu docs/v0/ad-library-sheet.template.csv), tối đa 200 dòng/lần.",
  },
  {
    id: "bookmarklet_extension",
    family: "user_capture",
    nameVi: "Bookmarklet + extension unpacked",
    nameEn: "Bookmarklet / unpacked extension",
    status: "wired",
    vnCommercial: "yes",
    radarPort: "manual",
    ingestPath: "/collect?url=",
    provides: ["prefill URL Ad Library user đang xem"],
    missing: ["đọc DOM Facebook"],
    notesVi: "Chỉ mở form Radar với URL. Không scrape facebook.com.",
  },
  {
    id: "scan_queue_urls",
    family: "user_capture",
    nameVi: "Hàng đợi cành /quet (URL search chính thức)",
    nameEn: "Official Ad Library search URLs",
    status: "wired",
    vnCommercial: "human_only",
    radarPort: "none",
    ingestPath: "GET /api/quet",
    provides: ["URL search VN + active theo 26 ngành / tên sản phẩm"],
    missing: ["payload ads"],
    notesVi: "Không phải kho ads. Sinh đường dẫn để người xem Meta, rồi lưu thẻ.",
  },
  {
    id: "user_enrichment",
    family: "user_capture",
    nameVi: "Giá / sold / watch name do user nhập",
    nameEn: "User-entered price and sales proxy",
    status: "wired",
    vnCommercial: "yes",
    radarPort: "manual",
    ingestPath: "/api/collect + /api/kenh + /api/top + /api/theo-doi",
    provides: [
      "listingPriceVnd",
      "shopeeSold",
      "tiktokSold",
      "lazadaSold",
      "tikiSold",
      "sendoSold",
      "googleAdsSeen",
      "youtubeAdsSeen",
      "tiktokAdsSeen",
      "youtubeViews",
      "product watch",
    ],
    missing: ["doanh số Facebook", "GMV đối thủ", "spend Google/YouTube đối thủ"],
    notesVi:
      "Proxy ngoài Facebook. Không crawl sàn / YouTube / Transparency. Chỉ sold sàn vào HeatScore; views và ads-seen không phải đơn.",
  },
  {
    id: "warehouse_landing_mine",
    family: "user_capture",
    nameVi: "Đích + URL trong thẻ đã lưu",
    nameEn: "Saved landing and copy URLs",
    status: "wired",
    vnCommercial: "yes",
    radarPort: "manual",
    ingestPath: "listChannelAnalysis + / + /kenh",
    provides: ["landingKinds", "landingByKind", "youtubeVideoIds"],
    missing: ["đã bán", "lượt xem nếu chưa nhập / chưa gọi Data API"],
    notesVi:
      "Đọc landingUrl và http(s) trong title/body đã lưu. Tách “có đích Tiki” khỏi “đã nhập đã bán”. Không HTTP GET sàn.",
  },
  {
    id: "youtube_data_api",
    family: "user_capture",
    nameVi: "YouTube Data API v3 (video đã lưu)",
    nameEn: "YouTube Data API views",
    status: "wired",
    vnCommercial: "yes",
    radarPort: "manual",
    ingestPath: "POST /api/youtube-views",
    provides: ["viewCount công khai của video ID trên thẻ"],
    missing: ["doanh số", "ads spend", "Analytics kênh người khác", "video chưa có trên kho"],
    notesVi:
      "Chỉ gọi googleapis.com/youtube/v3/videos. ID lấy từ kho — client không gửi id lạ. Views không vào HeatScore. Cần YOUTUBE_API_KEY. Không scrape youtube.com.",
  },
  {
    id: "youtube_search_api",
    family: "user_capture",
    nameVi: "YouTube Data API v3 (search.list)",
    nameEn: "YouTube search + views",
    status: "wired",
    vnCommercial: "yes",
    radarPort: "manual",
    ingestPath: "POST /api/platform-stats youtube_search",
    provides: ["video công khai theo title cụm", "viewCount", "URL watch lưu research link"],
    missing: ["doanh số", "đảm bảo đúng SKU", "quota"],
    notesVi: "googleapis.com/youtube/v3/search rồi videos.list. Views không vào HeatScore. Không scrape youtube.com.",
  },
  {
    id: "google_cse_listings",
    family: "user_capture",
    nameVi: "Google Custom Search — đích sàn",
    nameEn: "Google CSE official listing URLs",
    status: "wired",
    vnCommercial: "yes",
    radarPort: "manual",
    ingestPath: "POST /api/platform-stats listing_search",
    provides: ["URL tiki.vn / shopee.vn / lazada.vn / sendo.vn"],
    missing: ["đã bán", "GMV", "bestseller toàn sàn"],
    notesVi: "Chỉ customsearch/v1. Lưu URL nếu host khớp. Không HTTP GET HTML sàn.",
  },
  {
    id: "shopee_open_platform",
    family: "own_account",
    nameVi: "Shopee Open Platform — shop của tôi",
    nameEn: "Shopee Open API",
    status: "wired",
    vnCommercial: "no",
    radarPort: "own_ads",
    ingestPath: "POST /api/platform-stats own_shop",
    provides: ["item + sold shop đã ủy quyền"],
    missing: ["đã bán đối thủ"],
    notesVi: "partner.shopeemobile.com. Lưu own_shop_daily. Không ghi sales_proxy thị trường.",
  },
  {
    id: "lazada_open_platform",
    family: "own_account",
    nameVi: "Lazada Open Platform — shop của tôi",
    nameEn: "Lazada Open API",
    status: "wired",
    vnCommercial: "no",
    radarPort: "own_ads",
    ingestPath: "POST /api/platform-stats own_shop",
    provides: ["SKU shop đã ủy quyền"],
    missing: ["đã bán đối thủ"],
    notesVi: "api.lazada.vn/rest. Không GET lazada.vn HTML. Không trộn HeatScore.",
  },
  {
    id: "tiktok_shop_open",
    family: "own_account",
    nameVi: "TikTok Shop Open — shop của tôi",
    nameEn: "TikTok Shop API",
    status: "wired",
    vnCommercial: "no",
    radarPort: "own_ads",
    ingestPath: "POST /api/platform-stats own_shop",
    provides: ["sản phẩm shop đã ủy quyền"],
    missing: ["GMV đối thủ"],
    notesVi: "open-api.tiktokglobalshop.com. Không scrape tiktok.com.",
  },
  {
    id: "tiki_hidden_json",
    family: "blocked",
    nameVi: "JSON ẩn tiki.vn / API storefront",
    nameEn: "Tiki storefront scrape",
    status: "blocked",
    vnCommercial: "no",
    radarPort: "none",
    ingestPath: "cấm",
    provides: [],
    missing: ["giấy phép"],
    notesVi: "Không phải Open API. Radar không GET tiki.vn.",
  },
  {
    id: "licensed_json_file",
    family: "licensed_vendor",
    nameVi: "File JSON đã mua (đĩa / S3 nội bộ)",
    nameEn: "Licensed JSON file",
    status: "wired",
    vnCommercial: "if_licensed",
    radarPort: "licensed",
    ingestPath: "POST /api/licensed/import + FMR_LICENSED_FEED_PATH",
    provides: ["NormalizedAd[] tối đa 10_000 / lần"],
    missing: ["ROAS đối thủ"],
    notesVi: "User đã mua/xuất hợp đồng. Radar chỉ đọc file local. Không crawl vendor.",
  },
  {
    id: "licensed_json_body",
    family: "licensed_vendor",
    nameVi: "Dán / POST JSON feed đã mua",
    nameEn: "Licensed JSON body",
    status: "wired",
    vnCommercial: "if_licensed",
    radarPort: "licensed",
    ingestPath: "POST /api/licensed/import { ads|items|data }",
    provides: ["cùng schema file", "nhận luôn dạng Meta ads_archive nếu user tự xuất hợp pháp"],
    missing: ["tự gọi Graph"],
    notesVi: "Ánh xạ field vendor (Foreplay-like) và data[] của Meta. Bỏ ads chính trị / không reach VN.",
  },
  {
    id: "licensed_http_feed",
    family: "licensed_vendor",
    nameVi: "HTTP API vendor user đã trả tiền",
    nameEn: "Licensed HTTPS feed",
    status: "wired",
    vnCommercial: "if_licensed",
    radarPort: "licensed",
    ingestPath: "FMR_LICENSED_FEED_URL + TOKEN",
    provides: ["JSON từ API user có hợp đồng (vd. Foreplay public.api)"],
    missing: ["Facebook Graph"],
    notesVi:
      "GET https tới vendor, Authorization header. Cấm host Facebook/Instagram/Meta. Token không log, không ghi DB.",
  },
  {
    id: "foreplay_api",
    family: "licensed_vendor",
    nameVi: "Foreplay Public API (nếu có hợp đồng)",
    nameEn: "Foreplay API",
    status: "mapped",
    vnCommercial: "if_licensed",
    radarPort: "licensed",
    ingestPath: "licensed HTTP → public.api.foreplay.co",
    provides: ["ads/brand user được phép qua Spyder/Discovery/Swipefile"],
    missing: ["cam kết official Meta", "ROAS Facebook"],
    notesVi:
      "Foreplay bán API (docs: public.api.foreplay.co/docs). Chỉ đồng bộ khi user có key và ToS cho phép đưa vào kho riêng. Không scrape Foreplay.",
  },
  {
    id: "vendor_csv_export",
    family: "licensed_vendor",
    nameVi: "CSV xuất từ BigSpy / AdSpy / PowerAdSpy / Adheart…",
    nameEn: "Paid spy-tool CSV export",
    status: "mapped",
    vnCommercial: "if_licensed",
    radarPort: "manual",
    ingestPath: "POST /api/collect/sheet",
    provides: ["thẻ user xuất từ tài khoản đã mua"],
    missing: ["API chính thức ổn định (phần lớn không có)", "số thật spend/ROAS"],
    notesVi:
      "Hầu hết spy-tool là dashboard + CSV, không API. Chỉ nhập file user tự xuất. Cấm scrape site họ. Heat vẫn ước lượng.",
  },
  {
    id: "meta_marketing_api",
    family: "own_account",
    nameVi: "Marketing API — ads của tài khoản mình",
    nameEn: "Marketing API insights",
    status: "wired",
    vnCommercial: "no",
    radarPort: "own_ads",
    ingestPath: "POST /api/own-ads/sync",
    provides: ["spend, impression, purchase, ROAS của ad account đã cấp token"],
    missing: ["ads đối thủ", "ngành hàng thị trường"],
    notesVi: "Chỉ act_ user sở hữu. Không trộn vào HeatScore / bảng xếp hạng thị trường.",
  },
  {
    id: "meta_business_suite",
    family: "own_account",
    nameVi: "Meta Business Suite / Ads Manager export",
    nameEn: "Business Suite export",
    status: "mapped",
    vnCommercial: "no",
    radarPort: "own_ads",
    ingestPath: "thủ công / Marketing API",
    provides: ["báo cáo campaigns của mình"],
    missing: ["thị trường"],
    notesVi: "Xuất CSV tài khoản mình — cùng bề mặt Own Ads, không phải Radar thị trường.",
  },
  {
    id: "meta_catalog_commerce",
    family: "own_account",
    nameVi: "Catalog / Commerce Manager của shop mình",
    nameEn: "Product catalog",
    status: "blocked",
    vnCommercial: "no",
    radarPort: "none",
    ingestPath: "không dùng cho thị trường",
    provides: ["SKU của chính mình"],
    missing: ["ads đối thủ đang chạy"],
    notesVi: "Catalog không cho biết sản phẩm nào trên thị trường đang chạy ads.",
  },
  {
    id: "scrape_ad_library",
    family: "blocked",
    nameVi: "Scrape facebook.com/ads/library",
    nameEn: "Ad Library HTML scrape",
    status: "blocked",
    vnCommercial: "no",
    radarPort: "none",
    ingestPath: "cấm",
    provides: [],
    missing: ["hợp pháp", "ổn định"],
    notesVi: "Vi phạm ToS Meta. Server Radar không GET Thư viện.",
  },
  {
    id: "scraper_wrappers",
    family: "blocked",
    nameVi: "Apify / SearchAPI / ScrapeCreators / Ad Library scrapers",
    nameEn: "Third-party Ad Library scrapers",
    status: "blocked",
    vnCommercial: "no",
    radarPort: "none",
    ingestPath: "cấm",
    provides: [],
    missing: ["giấy phép Meta"],
    notesVi: "Bọc scrape. Không kết nối vào kho.",
  },
  {
    id: "scrape_shopee_tiktok",
    family: "blocked",
    nameVi: "Crawl Shopee / TikTok Shop",
    nameEn: "Marketplace scrape",
    status: "blocked",
    vnCommercial: "no",
    radarPort: "none",
    ingestPath: "cấm",
    provides: [],
    missing: ["doanh số Facebook (dù crawl cũng không có)"],
    notesVi: "Proxy sold chỉ do user nhập. Không scrape Shopee / Lazada / Tiki / Sendo / TikTok / YouTube HTML.",
  },
  {
    id: "competitor_pixel_roas",
    family: "blocked",
    nameVi: "Harvest pixel / đoán ROAS đối thủ",
    nameEn: "Pixel harvest / fake ROAS",
    status: "blocked",
    vnCommercial: "no",
    radarPort: "none",
    ingestPath: "cấm",
    provides: [],
    missing: ["số thật"],
    notesVi: "Không ai ngoài chủ ad account có CPA/ROAS. Cấm bịa spend.",
  },
];

export function sourceById(id: string): DataSource | undefined {
  return DATA_SOURCES.find((row) => row.id === id);
}

export function sourcesByFamily(family: SourceFamily): DataSource[] {
  return DATA_SOURCES.filter((row) => row.family === family);
}

export function wiredVnCommercialSourceIds(): string[] {
  return DATA_SOURCES.filter(
    (row) =>
      row.status === "wired" &&
      (row.vnCommercial === "yes" || row.vnCommercial === "human_only" || row.vnCommercial === "if_licensed"),
  ).map((row) => row.id);
}

export function blockedSourceIds(): string[] {
  return DATA_SOURCES.filter((row) => row.status === "blocked").map((row) => row.id);
}

export function autoSyncSourceIds(): string[] {
  return DATA_SOURCES.filter(
    (row) =>
      row.status === "wired" &&
      (row.radarPort === "manual" || row.radarPort === "licensed") &&
      row.vnCommercial !== "no" &&
      row.id !== "scan_queue_urls" &&
      row.id !== "youtube_data_api" &&
      row.id !== "youtube_search_api" &&
      row.id !== "google_cse_listings" &&
      row.id !== "warehouse_landing_mine",
  ).map((row) => row.id);
}

export const SOURCE_FAMILY_VI: Record<SourceFamily, string> = {
  official_meta: "Chính thức Meta",
  user_capture: "User tự lưu",
  licensed_vendor: "Feed / API đã mua",
  own_account: "Ads của tôi",
  blocked: "Cấm đồng bộ",
};
