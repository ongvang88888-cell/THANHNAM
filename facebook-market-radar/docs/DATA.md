# Dữ liệu và cổng IAdIndexProvider

Mọi nguồn ads đi qua port. Domain không import SDK Meta / filesystem.

## Port

`IAdIndexProvider` trong `src/domain/ports.ts`:

| `source` | Adapter | Hành vi |
|----------|---------|---------|
| `manual` | `ManualAdIndexProvider` | Trả payload user đã validate (URL + form / snapshot JSON) |
| `licensed` | `LicensedAdIndexProvider` | File (`FMR_LICENSED_FEED_PATH`), HTTPS vendor (`FMR_LICENSED_FEED_URL`, cấm host Meta), hoặc JSON body. Không có nguồn → `[]` |
| `own_ads` | `OwnAdsMarketingApiProvider` | Insights Marketing API → `OwnCampaignInsight` (không trộn vào điểm nóng thị trường) |

## Schema (Prisma / SQLite local)

- `advertiser_pages` — `@@unique([appId, pageId])`
- `ads` — `@@unique([appId, libraryId])`, `listingPriceVnd` tùy chọn (giá user nhập, không scrape)
- `product_watches` — `@@unique([appId, slug])` tên sản phẩm user ghi để soi cường độ ads
- `ad_creatives`
- `niches`, `product_clusters` — `@@unique([appId, slug])`, `imageUrl` tùy chọn trên cụm và quảng cáo
- `ad_product_links`
- `sales_proxy_observations` — `source` là chuỗi (`SHOPEE`, `TIKTOK`, `LAZADA`, `TIKI`, `SENDO`, `GOOGLE_ADS`, `YOUTUBE_ADS`, `TIKTOK_ADS`, `YOUTUBE_VIEWS`). Chỉ nguồn sold vào HeatScore.
- `market_snapshots` — `@@unique([appId, clusterId, weekStart])`
- `own_insights_daily` — `@@unique([appId, adAccountId, date, campaignId])`
- `alerts`
- `page_watches` — `@@unique([appId, pageId])` trang user theo dõi (cảnh báo khi lưu thẻ mới)
- `creative_boards` — `@@unique([appId, slug])` swipe file
- `board_items` — `@@unique([boardId, libraryId])`
- `ad_tags` — `@@unique([appId, libraryId, tag])` góc user gắn

`app_id` mặc định `fmr_vn`. Token Marketing API chỉ qua env, không ghi DB, không log.

## Parse URL Ad Library

Chỉ parse query string user dán:

- `id` → library id
- `view_all_page_id` → page
- `q` + `country` → search context (không tự kéo kết quả)

`buildAdLibrarySearchUrl(query)` tạo URL search chính thức (VN, ads đang chạy). Server **không** HTTP GET URL này.

## Hàng đợi quét cành

`src/domain/ad-library-scan.ts` + `SCAN_BRANCHES`: gộp `searchKeywords`, keyword catalog hữu ích, và nhánh tên sản phẩm. Cành “đã phủ” khi title/body ads đã lưu khớp query. Ưu tiên ngành trống.

`GET /api/quet` trả plan (catalog + `runningProducts` + `nameVariants` + `copyKeywords`).
`GET /api/quet/mo-rong?offset=&limit=&niche=&q=` phân trang ~1.000.000 ô tìm chính thức (không dump Facebook).
`GET /api/quet/tim?q=` và `GET /api/theo-doi?ten=` tìm bài đã lưu theo tên / từ khóa trong body, kèm URL Thư viện.

## YouTube Data API (không scrape)

`POST /api/youtube-views` (cùng `x-fmr-key`) lấy `viewCount` công khai qua `www.googleapis.com/youtube/v3/videos` cho video ID đã parse từ thẻ / research link. Client **không** gửi id. Views ghi `YOUTUBE_VIEWS` và **không** vào HeatScore. Cần `YOUTUBE_API_KEY`. Server không HTTP GET youtube.com.

`GET/POST /api/platform-stats` — catalog + nút lấy thống kê:
- `youtube_ids` / `youtube_search` → googleapis.com/youtube/v3 only
- `listing_search` → googleapis.com/customsearch/v1, persist URL nếu `classifyLanding` khớp (bảng `cluster_research_links`)
- `own_shop` → partner.shopeemobile.com / api.lazada.vn / open-api.tiktokglobalshop.com → `own_shop_daily` (không `sales_proxy_observations`)
- `all` chạy mọi cổng đã khóa

Rollback schema: drop `cluster_research_links` + `own_shop_daily`. Expand-only; không đụng lịch sử sold/ads.
`GET /api/nguon` — catalog nguồn (official / user / licensed / own / blocked) + thống kê kho.
`GET /api/manh` — sản phẩm đạt ngưỡng mạnh trên kho đã lưu (`estimated: true`, `facebookNationalDump: false`).
`GET /api/tong-hop` — bảng đa kênh (`estimated: true`, `nationalSalesDump: false`).
`GET /api/kenh?tab=shopee` — dashboard từng nền tảng (`autoCrawl: false`).
`GET /api/top?tab=shopee&trang=&niche=&q=` — 999 tên nghiên cứu / kênh, overlay kho nếu khớp mạnh (`nationalDump: false`).
`POST /api/kenh` — ghi một chỉ số kênh vào cụm đã có (cần `x-fmr-key`).
`POST /api/collect/sheet` nhập CSV (tối đa 200 dòng), idempotent theo `libraryId`.
`POST /api/collect` nhận thêm `watchPage` + `tags[]` (góc creative) + sold/ads/views kênh.
`POST /api/licensed/import` — JSON body `ads|items|data`, hoặc HTTP vendor, hoặc file. Bỏ ads chính trị / không reach VN. Cần `x-fmr-key`.

Bản đồ nguồn đầy đủ: [SOURCES.md](./SOURCES.md). Đa kênh: [CHANNELS.md](./CHANNELS.md). Server không HTTP GET Facebook / Transparency / YouTube / sàn.
`GET/POST/DELETE /api/theo-doi-trang` — watch page (ghi cần `x-fmr-key`).
`GET/POST/DELETE /api/boards` và `/api/boards/items` — bộ sưu tập.
`GET/POST /api/tags` — nhãn góc trên thẻ đã lưu.

Cụm copy lấy từ title/body ads active (2–3 từ, bỏ stopword / giá). Server không HTTP GET Facebook.

Server không HTTP GET tới Facebook khi user dán URL.
