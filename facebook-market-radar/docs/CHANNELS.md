# Kênh bán hàng / ads ngoài Facebook

Nghiên cứu mọi đường **có thật** để thống kê sản phẩm vừa **bán được nhiều** vừa **chạy ads nhiều** trên Facebook, Google, YouTube và sàn TMĐT Việt Nam.

**Kết luận khóa:** không có dump chính thức “top bán chạy + top ads VN” trên bất kỳ kênh nào. Radar cộng **thẻ Facebook đã lưu** với **số user tự đọc rồi nhập**. Mọi điểm tổng hợp là **ước lượng**. Server **không HTTP GET** facebook.com, adstransparency.google.com, youtube.com, shopee.vn, lazada.vn, tiki.vn, sendo.vn, tiktok.com.

UI: chip nền tảng trên `/` · `/kenh/[facebook|instagram|google|youtube|tiktok|shopee|lazada|tiki|sendo]` · `/top/[cùng slugs]` (999 tên nghiên cứu / kênh, 50 dòng/trang) · `/tong-hop` · API: `GET /api/kenh?tab=` + `GET /api/top?tab=` + `GET /api/tong-hop` (`estimated: true`, `autoCrawl: false`, `facebookNationalDump: false`, `nationalSalesDump: false`) · ghi thêm: `POST /api/kenh`.

**Tự động liên tục** = tính lại từ kho mỗi lần mở trang và mỗi 30 giây (tab đang mở). **Không** có crawler Shopee / Lazada / Google / YouTube / Facebook.

## 1. Kênh và việc được phép

| Kênh | Việc hợp pháp | Radar làm | Không có |
|------|----------------|-----------|----------|
| Meta Ad Library (web) | Xem creative, ngày bắt đầu, còn chạy, page | Sinh URL; user lưu thẻ | Spend, ROAS, đơn Facebook, dump toàn quốc |
| Google Ads Transparency | Xem creative Search/Display/YouTube, region=VN | Sinh URL; user **đếm tay** ads | Spend, chuyển đổi, API dump commercial VN |
| YouTube public | Tìm video; Data API views nếu có ID | User nhập lượt xem | Doanh số, ads spend đối thủ, Analytics kênh người khác |
| TikTok Creative Center | Top Ads đã chọn, region=VN | Sinh URL; user đếm tay | Mọi ads đang chạy, spend chính xác, đơn Shop |
| Shopee / Lazada / Tiki / Sendo | Đọc “đã bán” trên listing | User nhập số | API đối thủ, GMV, bảng bán chạy toàn sàn |
| Google Trends / Shopping | Nhu cầu tìm / listing giá | Chỉ URL | Doanh số tuyệt đối |
| Ads / shop của bạn | Marketing API, Seller Center, Merchant | Bề mặt Own Ads | Không trộn vào bảng thị trường |

Cấm: Apify / SerpAPI / crawl sàn / scrape Transparency / scrape YouTube để xếp hạng.

## 2. Chỉ số trên bảng `/tong-hop`

| Cột | Nguồn | Vào HeatScore? |
|-----|--------|----------------|
| FB ads / trang / ngày chạy / điểm nóng | Thẻ Ad Library đã lưu | Có (cường độ, độ bền, tốc độ) |
| Đã bán Shopee / TikTok / Lazada / Tiki / Sendo | User nhập (peak theo nguồn) | Có — **max sold** các nguồn này |
| Ads Google / YouTube / TikTok đã đếm | User đếm trên trang chính thức | Không (chỉ `adPush`) |
| Lượt xem YouTube | User nhập | **Không** — không phải đơn |
| Đẩy ads / Đẩy bán / Tổng hợp | Công thức ước lượng | Cột riêng, luôn `estimated: true` |

Công thức (kho đã lưu, không phải toàn quốc):

- `adPush` = 0.7 × cường độ Facebook + 0.3 × logScale(ads Google+YouTube+TikTok đã đếm, 30)
- `soldPush` = logScale(tổng peak “đã bán” theo sàn, 10_000)
- `composite` = 0.55 × adPush + 0.45 × soldPush

Sắp xếp `?xep=ads|sold|tong`.

## 3. Cách thu thập

1. `/quet` → mở Thư viện Meta → `/collect` lưu thẻ.
2. Mở URL chính thức trên `/tong-hop` (Google Transparency, YouTube, Shopee…).
3. Đọc số trên trang → nhập form collect hoặc `POST /api/kenh` (cùng `x-fmr-key`).
4. Sheet CSV: thêm cột `lazadaSold`, `tikiSold`, `sendoSold`, `googleAdsSeen`, `youtubeAdsSeen`, `tiktokAdsSeen`, `youtubeViews`.

Licensed feed **không** được trỏ vào host sàn / Transparency / YouTube (`licensed-host.ts`).

## 4. Việc cấm

- HTTP GET / headless các host ở trên để xếp hạng
- Gọi Google Ads Transparency API như thể đó là kho bán hàng VN (API chủ yếu EEA)
- Trộn views YouTube vào proxy bán / HeatScore
- Trộn spend tài khoản của bạn vào bảng thị trường
- Seed bảng “top toàn quốc” giả / invent GMV cho catalog 999 tên

## 5. Catalog 999 tên / kênh (`/top`)

Cùng **999 tên nghiên cứu** trên mọi nền tảng (26 ngành, round-robin, SKU sâu từ lexicon). Mỗi kênh **chỉ đổi thứ tự** theo ngành hay gặp trên kênh đó (Shopee: mẹ bé / thực phẩm; YouTube: điện tử / khóa học…). Mỗi dòng có URL chính thức (Ad Library, Ads Transparency, YouTube, Creative Center, Shopee, Lazada, Tiki, Sendo). User tự mở — server không HTTP GET.

Cột số kho chỉ hiện khi tiêu đề catalog khớp mạnh cụm đã lưu (≥2 token hoặc normalize trùng). Một từ “serum” không ăn số của “serum vitamin c”. Lượt xem YouTube không phải đơn hàng.

`GET /api/top?tab=shopee&trang=1` trả `nationalDump: false`, `autoCrawl: false`.

Facebook-only: [SOURCES.md](./SOURCES.md). Sản phẩm: [PRODUCT.md](./PRODUCT.md).
