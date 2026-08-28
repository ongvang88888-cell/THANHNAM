# Tìm theo từ khóa trong Meta Ad Library — đặc tả chính xác

Tài liệu này là nguồn sự thật cho câu hỏi: *“Gõ từ khóa → lấy danh sách ads liên quan trong Ad Library → thống kê thành list được không?”*

Nguồn đối chiếu:

- [Graph API `ads_archive` (v26.0)](https://developers.facebook.com/docs/graph-api/reference/ads_archive/)
- Phạm vi sản phẩm Radar: [`PRODUCT.md`](./PRODUCT.md), [`DATA.md`](./DATA.md)
- URL search chính thức trong code: `buildAdLibrarySearchUrl` (`src/domain/ad-library-url.ts`)

**Phiên bản Graph API được trích dẫn:** `v26.0` (tài liệu Meta tại thời điểm viết doc này). Meta có thể đổi hành vi; luôn kiểm tra lại trang Reference trước khi phụ thuộc production.

---

## 1. Kết luận ngắn (đúng / sai)

| Câu hỏi | Trả lời chính xác |
|--------|-------------------|
| Trên **web** Ad Library, gõ từ khóa rồi thấy list ads (kể cả ads bán hàng VN) được không? | **Có.** UI Thư viện quảng cáo hỗ trợ tìm theo từ khóa + quốc gia (vd. Việt Nam, “Tất cả quảng cáo”). |
| App tự gọi API `GET /ads_archive?search_terms=...&ad_reached_countries=['VN']` rồi **tự đổ list ads bán hàng chỉ chạy VN** được không? | **Không đáng tin / thực tế không dùng được cho use-case thương mại VN.** Theo Meta: ads **không** tiếp cận bất kỳ vị trí nào ở EU **chỉ** được API trả về nếu thuộc nhóm *social issues, elections or politics*. Ads bán hàng chỉ chạy VN thường **không** nằm trong kết quả API. |
| App sinh URL Thư viện theo từ khóa, user mở Meta, rồi **lưu thẻ** và thống kê trên dữ liệu đã lưu được không? | **Có.** Đây là hướng Radar (`/quet`, `/api/quet/tim`) — hợp lệ và khớp `PRODUCT.md`. |
| Kết quả = đúng ads vừa hiện trên News Feed cá nhân? | **Không.** Ad Library ≠ News Feed. |

Hai bề mặt **không được trộn**:

1. **Thư viện (UI / URL chính thức)** — người xem được ads công khai theo từ khóa + country.
2. **Ad Library API (`ads_archive`)** — programmatic; **phạm vi hẹp hơn UI**, đặc biệt với ads thương mại ngoài EU.

Radar **cấm** gọi `/ads_archive` để lấy ads bán hàng VN và **cấm** scrape `facebook.com/ads/library`.

---

## 2. “Bài viết” trong Ad Library nghĩa là gì?

Trong Ad Library / API, đơn vị là **archived ad** (quảng cáo đã/đang phân phối được lưu trong thư viện), **không** phải mọi bài viết Page/organic trên News Feed.

Mỗi thẻ thường gắn với:

- một **Facebook Page** chạy ads (`page_id` / `page_name`)
- **nội dung creative** (text, ảnh/video, CTA)
- **trạng thái** đang chạy / không còn đủ điều kiện phân phối
- **quốc gia / khu vực** đã tiếp cận (theo bộ lọc search)
- **link snapshot** xem creative trên Thư viện

Gọi đó là “bài viết” trong ngôn ngữ sản phẩm Radar thì được (UI tiếng Việt), nhưng kỹ thuật đúng tên là **ad / archived ad**.

---

## 3. Tìm theo từ khóa trên Web Ad Library (đúng với nhu cầu “list theo keyword”)

### 3.1 Cách hoạt động

Người dùng (hoặc app mở giúp) vào:

`https://www.facebook.com/ads/library/`

với query tối thiểu:

| Tham số URL | Ý nghĩa | Giá trị Radar mặc định |
|-------------|---------|-------------------------|
| `q` | Từ khóa tìm kiếm | Chuỗi user nhập (đã trim) |
| `country` | Quốc gia Thư viện | `VN` |
| `active_status` | Lọc trạng thái | `active` (đang chạy) |
| `ad_type` | Loại | `all` |
| `media_type` | Media | `all` |
| `search_type` | Kiểu khớp từ khóa | `keyword_unordered` |
| `is_targeted_country` | Cờ UI Thư viện | `false` |

Hàm chuẩn trong repo:

```ts
buildAdLibrarySearchUrl(query, "VN")
// → https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=VN&...
```

### 3.2 User nhận được gì

- Danh sách thẻ ads khớp từ khóa **trên UI Meta** (do Meta render).
- Có thể mở từng thẻ, copy URL có `id=...` (library id), hoặc xem theo Page (`view_all_page_id`).

### 3.3 App nhận được gì nếu **chỉ** mở URL

- **Không** nhận JSON list tự động.
- Server Radar **không** HTTP-GET URL này (cấm scrape).

Để có list trong DB Radar: user **lưu thẻ** (form `/collect`, sheet CSV, bookmarklet/extension mở form — không fetch Facebook phía server).

---

## 4. Ad Library API — `GET /{version}/ads_archive`

Endpoint:

```http
GET https://graph.facebook.com/v26.0/ads_archive
```

### 4.1 Meta tìm từ khóa như thế nào (đúng doc)

Reading API trả archived ads dựa trên keyword search trong:

- text
- images
- audio từ video
- nút call-to-action

Meta **không dịch** từ khóa. Muốn ads tiếng Việt → nhập từ khóa tiếng Việt.

### 4.2 Tham số bắt buộc / cốt lõi

| Tham số | Bắt buộc? | Giá trị / ghi chú chính xác |
|---------|-----------|-----------------------------|
| `access_token` | Có | Token app/user đủ quyền Ad Library API |
| `ad_reached_countries` | **Có (Required)** | Mảng mã ISO (vd. `['VN']`, `['GB']`) hoặc `ALL`. **Ghi chú Meta:** ads không tiếp cận bất kỳ vị trí EU nào **chỉ** trả về nếu là social issues / elections / politics. |
| `search_terms` **hoặc** `search_page_ids` | Phải có một trong hai để search hữu ích | Không truyền cả hai kiểu “dump toàn bộ thư viện” |
| `search_terms` | Tuỳ chọn | Chuỗi ≤ **100** ký tự. Dấu cách = logic **AND** (cả các từ; không có toán tử OR phức tạp trong chuỗi). |
| `search_type` | Tuỳ chọn | `KEYWORD_UNORDERED` (mặc định): các từ theo thứ tự bất kỳ. `KEYWORD_EXACT_PHRASE`: khớp đúng cụm; nhiều cụm exact ngăn bằng dấu phẩy. |
| `search_page_ids` | Tuỳ chọn | Tối đa **10** Page ID / request |
| `ad_active_status` | Tuỳ chọn | `ACTIVE` (mặc định theo doc: ads đủ điều kiện delivery), `INACTIVE`, `ALL` |
| `ad_type` | Tuỳ chọn | Default doc: `"ALL"`. Enum: `ALL`, `EMPLOYMENT_ADS`, `FINANCIAL_PRODUCTS_AND_SERVICES_ADS`, `HOUSING_ADS`, `POLITICAL_AND_ISSUE_ADS`. (`CREDIT_ADS` cũ map sang financial.) |
| `ad_delivery_date_min` / `max` | Tuỳ chọn | `YYYY-mm-dd` |
| `languages` | Tuỳ chọn | ISO 639-1 (+ CMN, YUE) |
| `media_type` | Tuỳ chọn | `ALL`, `IMAGE`, `MEME`, `VIDEO`, `NONE` |
| `publisher_platforms` | Tuỳ chọn | `FACEBOOK`, `INSTAGRAM`, `AUDIENCE_NETWORK`, `MESSENGER`, `WHATSAPP`, `OCULUS`, `THREADS`, `STREAMING_SERVICES` |
| `bylines`, `delivery_by_region`, `estimated_audience_size_*` | Tuỳ chọn | **Chỉ** `POLITICAL_AND_ISSUE_ADS` |
| `unmask_removed_content` | Tuỳ chọn | default `false` |
| `fields` | Nên luôn gửi | Không gửi → response gần như vô dụng cho UI |
| `limit` | Tuỳ chọn | Phân trang Graph API |

### 4.3 Ví dụ request (chính trị / issue — đúng mẫu Meta)

```bash
curl -G \
  -d "search_terms=california" \
  -d "ad_type=POLITICAL_AND_ISSUE_ADS" \
  -d "ad_reached_countries=['US']" \
  -d "access_token=<ACCESS_TOKEN>" \
  "https://graph.facebook.com/v26.0/ads_archive"
```

Ví dụ hướng thương mại EU (khi ads đã reach EU; **không** suy ra được cho VN-only):

```bash
curl -G \
  --data-urlencode "search_terms=sunscreen" \
  -d "search_type=KEYWORD_UNORDERED" \
  -d "ad_type=ALL" \
  -d "ad_active_status=ACTIVE" \
  -d "ad_reached_countries=['GB']" \
  -d "fields=id,page_id,page_name,ad_creative_bodies,ad_creative_link_titles,ad_snapshot_url,ad_delivery_start_time,ad_delivery_stop_time,publisher_platforms" \
  -d "limit=25" \
  -d "access_token=<ACCESS_TOKEN>" \
  "https://graph.facebook.com/v26.0/ads_archive"
```

### 4.4 Response list

Hình dạng Graph API chuẩn:

```json
{
  "data": [ /* ArchivedAd nodes */ ],
  "paging": {
    "cursors": { "before": "...", "next": "..." },
    "next": "https://graph.facebook.com/..."
  }
}
```

- Hết kết quả khi paginate tới page mà `data` rỗng (theo doc Meta “End of Results”).
- Mỗi phần tử trong `data` là một archived ad; field cụ thể phụ thuộc `fields=` và loại ads / vùng.

Field thường dùng cho list UI (khi API trả về):

| Field (yêu cầu qua `fields=`) | Dùng cho |
|-------------------------------|----------|
| `id` | Ad Library archive id |
| `page_id`, `page_name` | Page chạy ads |
| `ad_creative_bodies` | Đoạn copy |
| `ad_creative_link_titles` / captions / descriptions | Tiêu đề / phụ đề (khi có) |
| `ad_snapshot_url` | Link xem creative trên Thư viện |
| `ad_delivery_start_time`, `ad_delivery_stop_time` | Thời cửa sổ phân phối |
| `publisher_platforms` | FB / IG / … |

`spend` / `impressions` (khi có) thường là **khoảng**, không phải số Ads Manager; độ sẵn có phụ thuộc loại ads và quy định minh bạch theo vùng — **không** dùng làm “doanh thu đối thủ”.

### 4.5 Lỗi API thường gặp (doc)

| Code | Ý nghĩa |
|------|---------|
| `190` | Access token không hợp lệ |
| `100` / `1009` | Tham số sai / không qua validation |
| `613` | Rate limit |
| `2500` | Lỗi parse graph query |

### 4.6 Hệ quả bắt buộc với thị trường VN (Radar)

Vì điều kiện EU trên `ad_reached_countries`:

- Gọi `search_terms=kem chống nắng` + `ad_reached_countries=['VN']` + `ad_type=ALL` **không** đảm bảo (và trong thực tế sản phẩm này **không dựa vào**) list ads bán hàng VN.
- Do đó `PRODUCT.md` khóa: **Không gọi `/ads_archive` để lấy ads bán hàng VN.**

API vẫn có thể hữu ích cho:

- nghiên cứu **political / issue** ads (khi đúng `ad_type` và country), hoặc
- nghiên cứu ads thương mại **đã reach** thị trường EU/UK theo điều kiện Meta,

nhưng **không** phải engine “gõ từ khóa VN → auto full list competitor VN”.

---

## 5. Luồng đúng trong Facebook Market Radar (từ khóa → list → thống kê)

### 5.1 Từ khóa → URL Thư viện (không scrape)

1. User nhập từ khóa / tên sản phẩm (vd. trên `/quet?ten=`).
2. Server tạo `buildAdLibrarySearchUrl(q, "VN")`.
3. User mở URL trên Meta → **thấy list trên UI Meta**.
4. User lưu từng thẻ cần giữ vào Radar (`/collect`, sheet, …) với `libraryId` từ URL `id=`.

### 5.2 Từ khóa → list **trong DB Radar**

`GET /api/quet/tim?q=...` (và logic `lookupScan` / product watch):

- Chỉ tìm trên **ads đã lưu** (+ feed licensed nếu cấu hình).
- Khớp tên / title / body đã lưu.
- Kèm URL Thư viện chính thức để bắt thêm thẻ.
- Response mang `estimated: true`, `officialSearchOnly: true` — không pretends là tổng ads Facebook.

### 5.3 Thống kê thành list (trên dữ liệu đã lưu — công thức thật)

Trên tập ads đã lưu khớp từ khóa / tên, Radar tính (xem `product-watch.ts`):

| Chỉ số | Định nghĩa |
|--------|------------|
| `activeAdCount` | Số thẻ đang `isActive` trong dữ liệu đã lưu khớp |
| `totalAdCount` | Tổng thẻ đã lưu khớp (active + không) |
| `distinctPageCount` | Số `pageId` khác nhau |
| `intensity` | `chua-co` / `it` / `vua` / `nhieu` theo ngưỡng đếm (ước lượng) |
| List từng thẻ | `libraryId`, page, title/body, niche/cluster, giá ước lượng nếu có |

Chuỗi hiển thị chuẩn:

`{activeAdCount} bài đang chạy / {distinctPageCount} trang · {totalAdCount} bài đã lưu`

**Cấm:** suy spend/ROAS/doanh thu đối thủ từ các số trên; xếp hạng ≠ tổng ads Facebook toàn quốc.

### 5.4 Cột list UI đề xuất (đầy đủ cho màn Search / Theo dõi)

| Cột | Nguồn |
|-----|--------|
| Ảnh / media | Creative đã lưu (user) |
| Tiêu đề / hook | `title` / snippet body |
| Page | `pageName` / `pageId` |
| Library ID | `libraryId` |
| Trạng thái | active / inactive (user cập nhật khi lưu) |
| Ngày thấy / ngày chạy | snapshot Radar |
| Landing / Shopee / TikTok | URL user dán |
| Tag góc | `ad_tags` |
| Link Thư viện | `https://www.facebook.com/ads/library/?id={libraryId}` |
| Link search cùng từ khóa | `buildAdLibrarySearchUrl(q)` |

Panel thống kê bên cạnh list: tổng khớp, số active, số page, intensity label, top page theo số thẻ đã lưu.

---

## 6. Checklist “không lỗi” khi implement / giải thích cho user

1. Không nói “API Ad Library lấy hết ads bán hàng VN theo từ khóa”.
2. Không nói list Radar = toàn bộ Thư viện Meta.
3. Không scrape News Feed hay `facebook.com/ads/library`.
4. Không gọi `/ads_archive` cho commercial VN trong Radar.
5. Từ khóa UI Thư viện: dùng URL chính thức (`q` + `country=VN` + …).
6. Thống kê chỉ trên dữ liệu đã lưu / licensed; luôn gắn nhãn ước lượng khi xếp hạng / cường độ.
7. `search_terms` API ≤ 100 ký tự; AND theo dấu cách; không dịch ngôn ngữ.
8. Token Marketing API / Ad Library không log, không ghi DB plaintext (xem `DATA.md`).
9. Phân biệt **Ads của tôi** (Marketing API insights của chính user) với **Radar thị trường** (tín hiệu gián tiếp).

---

## 7. Ma trận quyết định nhanh

```text
Bạn muốn gì?
│
├─ Gõ từ khóa, XEM list ads bán hàng VN trên Meta
│    → Mở Ad Library UI / buildAdLibrarySearchUrl — Có
│
├─ Gõ từ khóa, APP TỰ KÉO JSON list ads bán hàng VN
│    → /ads_archive — Không (khóa sản phẩm + giới hạn Meta EU)
│
├─ Gõ từ khóa, APP có list + thống kê trong dashboard
│    → User lưu thẻ từ Thư viện + thống kê trên DB Radar — Có
│
└─ Ads vừa hiện trên News Feed cá nhân
     → Ngoài phạm vi Ad Library / Radar — Không làm
```

---

## 8. Tham chiếu code

| Việc | Chỗ |
|------|-----|
| URL search / parse | `src/domain/ad-library-url.ts` |
| Hàng đợi cành từ khóa | `src/domain/ad-library-scan.ts`, `/quet` |
| Tìm theo tên/từ khóa đã lưu | `GET /api/quet/tim`, `product-watch.ts` |
| Cổng dữ liệu | `src/domain/ports.ts`, `docs/DATA.md` |
| Khóa phạm vi | `docs/PRODUCT.md` |
