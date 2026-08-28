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
- `sales_proxy_observations`
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
`GET /api/nguon` — catalog nguồn (official / user / licensed / own / blocked) + thống kê kho.
`POST /api/collect/sheet` nhập CSV (tối đa 200 dòng), idempotent theo `libraryId`.
`POST /api/collect` nhận thêm `watchPage` + `tags[]` (góc creative).
`POST /api/licensed/import` — JSON body `ads|items|data`, hoặc HTTP vendor, hoặc file. Bỏ ads chính trị / không reach VN. Cần `x-fmr-key`.

Bản đồ nguồn đầy đủ: [SOURCES.md](./SOURCES.md). Server không HTTP GET Facebook.
`GET/POST/DELETE /api/theo-doi-trang` — watch page (ghi cần `x-fmr-key`).
`GET/POST/DELETE /api/boards` và `/api/boards/items` — bộ sưu tập.
`GET/POST /api/tags` — nhãn góc trên thẻ đã lưu.

Cụm copy lấy từ title/body ads active (2–3 từ, bỏ stopword / giá). Server không HTTP GET Facebook.

Server không HTTP GET tới Facebook khi user dán URL.
