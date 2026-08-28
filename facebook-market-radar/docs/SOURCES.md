# Nguồn dữ liệu ads Facebook — ngành hàng / sản phẩm đang chạy

Nghiên cứu mọi đường **có thật** để đưa bài ads, ngành hàng, sản phẩm đang chạy trên Facebook vào kho Radar. Cập nhật theo tài liệu Meta Graph API **v26.0** (Ads Archive / Archived Ad) và điều khoản Content Library.

**Kết luận khóa:** không có API chính thức nào dump ads **bán hàng đang chạy tại Việt Nam**. Kho Radar = thẻ **user đã lưu** + **feed/CSV/API đã mua hoặc tự xuất**. HeatScore luôn **ước lượng**. Không ai (kể cả vendor) có doanh số / ROAS / CPA đối thủ trên Facebook.

Bản đồ máy: `GET /api/nguon` và UI `/nguon`.

**Tìm sản phẩm ads mạnh nhất:** không có bảng Meta toàn quốc. Playbook + xếp kho đã lưu: UI `/manh`, `GET /api/manh`.

**Đa kênh (Google / YouTube / sàn):** không có dump bán chạy toàn quốc. Bảng ước lượng trên kho đã lưu: trang chủ `/` (một bảng), `/kenh/*`, [CHANNELS.md](./CHANNELS.md). Ghi snapshot 6 giờ/lần. Không crawl — chỉ số đã nhập + API chính thức.

## 1. Việc Radar cần vs việc Meta cho

| Cần cho kho ngành hàng VN | Meta có? |
|---------------------------|----------|
| Ads thương mại đang chạy, country = VN | **Chỉ trên website** Thư viện (`facebook.com/ads/library`, loại Tất cả quảng cáo) |
| Programmatic dump cùng tập đó | **Không** — `/ads_archive` không trả commercial nếu ads không reach EU |
| Spend / impression commercial VN | **Không** |
| ROAS / CPA / đơn Facebook của đối thủ | **Không tồn tại** ở mọi nguồn công khai |
| Ads của **chính tài khoản** | Marketing API (bề mặt Own Ads, không trộn HeatScore) |

Câu chính thức trên `GET /ads_archive` (v26): *“Ads that did not reach any location in the EU will only return if they are about social issues, elections or politics.”*  
Tham chiếu: [Ads Archive](https://developers.facebook.com/docs/graph-api/reference/ads_archive/), [Archived Ad fields](https://developers.facebook.com/docs/graph-api/reference/archived-ad/).

Trang [Ad Library API](https://www.facebook.com/ads/library/api/) nói rõ API giúp tìm: ads chính trị/vấn đề, và ads **mọi loại đã deliver vào EU** trong ~1 năm. Để xem *all ads currently running*, Meta bảo dùng **website** Thư viện — không phải API.

## 2. Nguồn chính thức Meta

### 2.1 Website Thư viện quảng cáo — **nguồn commercial VN duy nhất**

- URL: `https://www.facebook.com/ads/library/` với `country=VN`, `active_status=active`, loại Tất cả.
- Có: creative, copy, page, ngày bắt đầu, còn chạy hay không, platform (FB/IG), link xem lại.
- Không có: spend, impression (trừ ads chính trị), like/share, ROAS.
- Radar: `/quet` chỉ **sinh URL**; user mở Meta; `/collect` lưu thẻ. Server **không GET** URL này.

Page Transparency (Giới thiệu trang → Tính minh bạch → Thư viện) là lối tắt theo `view_all_page_id`. Instagram ads thương mại VN nằm **cùng** Thư viện, không có API riêng.

### 2.2 Graph `GET /{version}/ads_archive` — **không dùng cho kho VN**

Bắt buộc `ad_reached_countries` + (`search_terms` hoặc `search_page_ids`).  
`ad_type` gồm ALL, POLITICAL_AND_ISSUE_ADS, HOUSING, EMPLOYMENT, FINANCIAL_PRODUCTS_AND_SERVICES.

Thực tế (cả diễn đàn Meta): `ad_reached_countries=US` (hay VN) chỉ ra ads chính trị/vấn đề; commercial US/VN trên website **không** nằm trong `data[]`. EU/UK commercial **có** vì DSA — không phải thị trường VN.

Field hữu ích nếu user **tự xuất hợp pháp** (EU/chính trị): `id`, `page_id`, `page_name`, `ad_creative_bodies[]`, `ad_creative_link_titles[]`, `ad_delivery_start_time`, `ad_snapshot_url`, `publisher_platforms`. Spend/impression **khoảng** chỉ ads chính trị.

Radar **không gọi** Graph. Parser licensed **có thể đọc** JSON `data[]` nếu user dán file họ lấy đúng phép — và **bỏ** hàng chính trị / không reach VN.

### 2.3 Ad Library Report

[facebook.com/ads/library/report](https://www.facebook.com/ads/library/report/) — CSV spend ads **chính trị/vấn đề** theo nước. Không có serum / bỉm / gadget. Không nhập vào xếp hạng ngành.

### 2.4 Marketing API (`ads_read` / insights)

Chỉ ad account user **sở hữu hoặc được cấp**. [Authorization](https://developers.facebook.com/docs/marketing-api/get-started/authorization/): không đọc account đối thủ.  
Radar: `POST /api/own-ads/sync` → bảng `own_insights_daily`. **Cấm** trộn vào HeatScore thị trường.

Business Suite / Ads Manager export = cùng dữ liệu first-party.

### 2.5 Catalog / Commerce Manager

SKU của shop mình. Không nói sản phẩm nào trên thị trường đang chạy ads.

### 2.6 Meta Content Library + CASD

[Get access](https://developers.facebook.com/docs/content-library-and-api/get-access/), [Transparency Center](https://transparency.meta.com/researchtools/meta-content-library), [Research Tools Terms](https://transparency.meta.com/researchtools/product-terms-meta-research/).

Chỉ học thuật / tổ chức nghiên cứu phi lợi nhuận; CASD duyệt; cleanroom; **cấm dùng thương mại**. Ngoài phạm vi sản phẩm. Không dump raw vào SQLite Radar.

### 2.7 Pages Graph, CrowdTangle

Pages API ≠ ads. CrowdTangle đã tắt.

## 3. Nguồn user tự thu (đã nối kho)

| Cổng | Đưa vào bảng |
|-------|----------------|
| `POST /api/collect` | `ads`, `advertiser_pages`, `product_clusters`, `ad_creatives` |
| `POST /api/collect/sheet` | cùng collect, ≤200 dòng, CSV mẫu `docs/v0/ad-library-sheet.template.csv` |
| Bookmarklet / `extension/` | chỉ mở `/collect?url=` |
| Google Sheets | xuất CSV → sheet import |
| `/quet` + `/quet/mo-rong` | URL search, không phải hàng ads |
| Giá / sold sàn / ads-seen / YouTube views | user nhập — proxy ngoài FB; views không vào HeatScore |
| `POST /api/kenh` | ghi thêm chỉ số vào cụm đã lưu |

Idempotent theo `@@unique([appId, libraryId])`.

## 4. Feed / API đã mua (hợp pháp nếu có hợp đồng)

Radar port `licensed` (`IAdIndexProvider`):

1. **JSON body** — dán trên `/collect` hoặc POST `{ ads|items|data }`.
2. **HTTPS vendor** — `FMR_LICENSED_FEED_URL` + `FMR_LICENSED_FEED_TOKEN`. Cấm host Facebook/Instagram/Meta.
3. **File** — `FMR_LICENSED_FEED_PATH`.

Mapper nhận field Radar **và** alias Meta / Foreplay-like (`facebook_ad_id`, `brand_name`, `transcript`, `started_running`, `thumbnail`…). Bỏ `javascript:` landing. Bỏ ads `POLITICAL_AND_ISSUE_ADS` và hàng `ad_reached_countries` không chứa VN.

### Vendor thương mại (không scrape site họ)

| Vendor | API? | Cách vào Radar |
|--------|------|----------------|
| **Foreplay** | Có — [public.api.foreplay.co/docs](https://public.api.foreplay.co/docs) (Spyder / Discovery / Swipefile, header `Authorization`) | `FMR_LICENSED_FEED_URL` trỏ endpoint user được phép; hoặc xuất JSON |
| BigSpy, AdSpy, PowerAdSpy, Adheart, SocialPeta, Pipiads, Minea, Dropispy | Phần lớn **không** có API ổn định; dashboard + CSV | User xuất CSV → `/api/collect/sheet` (map cột) |
| MagicBrief / SwipeKit | swipe file / một số API | Xuất → licensed JSON |
| Apify, SearchAPI, ScrapeCreators, “Ad Library scraper” | Bọc **scrape** website Meta | **Cấm** |

Mua API vendor **không** biến dữ liệu thành official Meta, **không** cho ROAS đối thủ. ToS vendor + ToS Meta vẫn ràng user. Radar chỉ nhận payload user đã có quyền.

## 5. Nguồn bịa / ngoài luật — không làm

- HTTP GET / headless `facebook.com/ads/library`
- Gọi `/ads_archive` với hy vọng ra serum VN
- Crawl Shopee / TikTok / Lazada / YouTube / Google Ads Transparency để “doanh số” hoặc xếp hạng
- Pixel sniffing, ước spend giả như số thật
- Seed 1 triệu dòng ranking giả
- Dump CASD vào app thương mại

## 6. Đồng bộ vào kho (thứ tự thật)

```
User / vendor JSON  →  parse snapshot  →  collectManual
CSV sheet           →  parseAdLibrarySheet → collectManual
Marketing API       →  own_insights_daily   (tách bề mặt)
```

Bảng thị trường: `ads` · `advertiser_pages` · `product_clusters` · `ad_product_links` · `market_snapshots` (Heat **ước lượng**) · `sales_proxy_observations` (user nhập).

Không có cột “tổng ads Facebook ngành mỹ phẩm VN”. Số trên UI = **đã lưu / đã import**.

## 7. Việc nên làm tiếp (không phá khóa)

1. Mỗi tuần: `/quet` → mở Thư viện → sheet/collect.  
2. Nếu mua Foreplay (hoặc vendor có API + hợp đồng): set URL/token, bấm nhập trên `/collect`.  
3. Không mua scraper.  
4. Own Ads chỉ để so với **ads của mình**.

Tài liệu sản phẩm: [PRODUCT.md](./PRODUCT.md) · cổng kỹ thuật: [DATA.md](./DATA.md) · đa kênh: [CHANNELS.md](./CHANNELS.md).
