# Kênh bán hàng / ads ngoài Facebook

Nghiên cứu mọi đường **có thật** để thống kê sản phẩm vừa **bán được nhiều** vừa **chạy ads nhiều** trên Facebook, Google, YouTube và sàn TMĐT Việt Nam.

**Kết luận khóa:** không có dump chính thức “top bán chạy + top ads VN” trên bất kỳ kênh nào. Radar cộng **thẻ Facebook đã lưu** với **số user tự đọc rồi nhập**. Mọi điểm tổng hợp là **ước lượng**. Server **không HTTP GET** facebook.com, adstransparency.google.com, youtube.com, shopee.vn, lazada.vn, tiki.vn, sendo.vn, tiktok.com.

UI: **trang chủ `/` chỉ bảng tổng hợp đủ cột** (mọi nền tảng). Menu trái nhóm **Nền tảng / Phân tích / Kho** (Shopee đầu tiên) + pill header trên trang kênh (`/kenh/…`) · `/xu-huong` hiện 999 tên kênh đang chọn (mặc định Shopee) · `/tong-hop` redirect về `/` · API: `GET /api/kenh?tab=` + `GET /api/top?tab=` + `GET /api/tong-hop` + `GET/POST /api/summary` (`estimated: true`, `autoCrawl: false`, `facebookNationalDump: false`, `nationalSalesDump: false`) · ghi thêm: `POST /api/kenh`.

**Cập nhật 6 giờ / lần** = `POST /api/summary/refresh` (systemd timer hoặc tab trang chủ khi đến hạn): gọi API chính thức nếu có khóa, rồi ghi snapshot kho vào `summary_cycles`. Bảng trên `/` luôn đọc **kho live** (nhập mới hiện ngay). **Không** có crawler Shopee / Lazada / Google / YouTube / Facebook. Ô trống = chưa nhập / chưa khóa — không bịa đã bán.

**Gắn khóa từ điện thoại:** `/nguon` + form trên `/kenh/*` → `POST /api/platform-keys` (cùng `x-fmr-key`). Lưu `data/platform-secrets.json` (chmod 600, không commit). Đăng nhập app trên máy user **không** phải khóa API; Radar không lấy cookie trình duyệt. Shop Open Platform chỉ `/own-ads`, không cột đã bán đối thủ.

KPI `/kenh` tách **có số** (observation đã nhập) và **có đích** (URL trên thẻ, copy, hoặc research link từ YouTube search / Google CSE). Ô 0% = chưa nhập số, không phải nền tảng biến mất. Nút **Lấy thống kê API** trên `/kenh/*` gọi `POST /api/platform-stats`: YouTube Data API (views + search), Google Custom Search (URL listing), Open Platform shop của bạn. Views / CSE / shop mình **không** thành “đã bán đối thủ”. HeatScore vẫn chỉ sold sàn user nhập.

## 1. Kênh và việc được phép

| Kênh | Việc hợp pháp | Radar làm | Không có |
|------|----------------|-----------|----------|
| Meta Ad Library (web) | Xem creative, ngày bắt đầu, còn chạy, page | Sinh URL; user lưu thẻ | Spend, ROAS, đơn Facebook, dump toàn quốc |
| Google Ads Transparency | Xem creative Search/Display/YouTube, region=VN | Sinh URL; user **đếm tay** ads | Spend, chuyển đổi, API dump commercial VN |
| YouTube public | Data API `videos.list` + `search.list` | `POST /api/youtube-views` và `platform-stats` (googleapis.com) | Doanh số, ads spend đối thủ, scrape youtube.com |
| TikTok Creative Center | Top Ads đã chọn, region=VN | Sinh URL; user đếm tay | Mọi ads đang chạy, spend chính xác, đơn Shop đối thủ |
| Shopee / Lazada / Tiki / Sendo | Đọc “đã bán” trên listing; CSE lấy URL; Open API shop mình | User nhập; CSE đích; `own_shop` | API đã bán đối thủ, GMV, bảng bán chạy toàn sàn |
| Google Trends / Shopping | Nhu cầu tìm / listing giá | Chỉ URL | Doanh số tuyệt đối |
| Ads / shop của bạn | Marketing API, Seller Center, Merchant | Bề mặt Own Ads | Không trộn vào bảng thị trường |

Cấm: Apify / SerpAPI / crawl sàn / scrape Transparency / scrape YouTube để xếp hạng.

## 2. Chỉ số trên bảng tổng hợp (`/`)

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

## 3. Cách thu thập (tối đa, vẫn hợp pháp)

1. `/quet` → mở Thư viện Meta → `/collect` lưu thẻ **kèm landing** nếu thấy.
2. Radar đọc `landingUrl` + URL trong title/body đã lưu → cột “có đích” trên `/kenh/{nền}`.
3. Mở **đích đã lưu** hoặc URL chính thức trên hàng đợi `/kenh` / trang chủ.
4. Đọc số trên trang → form hàng đợi, `/collect`, hoặc `POST /api/kenh` (cùng `x-fmr-key`).
5. Sheet CSV: cột `lazadaSold`, `tikiSold`, `sendoSold`, `googleAdsSeen`, `youtubeAdsSeen`, `tiktokAdsSeen`, `youtubeViews`.
6. Feed licensed HTTPS (không phải host sàn / Transparency / YouTube).
7. YouTube Data API: `YOUTUBE_API_KEY` — `videos.list` (ID đã lưu) + `search.list` (title cụm, hạn ngạch).
8. Google Custom Search: `GOOGLE_CSE_KEY` + `GOOGLE_CSE_CX` — URL `site:tiki.vn`… Không lấy đã bán.
9. Open Platform shop **của bạn** (Shopee / Lazada / TikTok Shop) → `/own-ads`, bảng `own_shop_daily`.
10. Ads Marketing API trên `/own-ads` — không trộn HeatScore thị trường.

Catalog API: [mục Official APIs](./DATA.md) + `/nguon` + `GET /api/platform-stats`.

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
