# Dữ liệu và cổng IAdIndexProvider

Mọi nguồn ads đi qua port. Domain không import SDK Meta / filesystem.

## Port

`IAdIndexProvider` trong `src/domain/ports.ts`:

| `source` | Adapter | Hành vi |
|----------|---------|---------|
| `manual` | `ManualAdIndexProvider` | Trả payload user đã validate (URL + form / snapshot JSON) |
| `licensed` | `LicensedAdIndexProvider` | Đọc feed JSON đã mua (`FMR_LICENSED_FEED_PATH`). Không có file → `[]` |
| `own_ads` | `OwnAdsMarketingApiProvider` | Insights Marketing API → `OwnCampaignInsight` (không trộn vào điểm nóng thị trường) |

## Schema (Prisma / SQLite local)

- `advertiser_pages` — `@@unique([appId, pageId])`
- `ads` — `@@unique([appId, libraryId])`
- `ad_creatives`
- `niches`, `product_clusters` — `@@unique([appId, slug])`, `imageUrl` tùy chọn trên cụm và quảng cáo
- `ad_product_links`
- `sales_proxy_observations`
- `market_snapshots` — `@@unique([appId, clusterId, weekStart])`
- `own_insights_daily` — `@@unique([appId, adAccountId, date, campaignId])`
- `alerts`

`app_id` mặc định `fmr_vn`. Token Marketing API chỉ qua env, không ghi DB, không log.

## Parse URL Ad Library

Chỉ parse query string user dán:

- `id` → library id
- `view_all_page_id` → page
- `q` + `country` → search context (không tự kéo kết quả)

Server không HTTP GET tới Facebook khi user dán URL.
