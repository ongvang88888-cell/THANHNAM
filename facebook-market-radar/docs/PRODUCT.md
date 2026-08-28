# Facebook Market Radar (VN) — phạm vi khóa

Sản phẩm **độc lập**. Không phải App #2 của edu-commerce-platform. Không tái sử dụng Payment / Entitlement / AdMob / Access Engine.

## Hai bề mặt (không trộn số)

| Bề mặt | Nguồn | User thấy | Cấm |
|--------|--------|-----------|-----|
| **Radar thị trường** | User lưu Ad Library + (sau này) feed có giấy phép | Cường độ, Độ bền, Tốc độ mới, Proxy bán, Điểm nóng **ước lượng** | Doanh thu / tỷ suất / chi phí đối thủ |
| **Ads của tôi** | Marketing API tài khoản user kết nối | Spend, impression, purchase, ROAS **của họ** | Dùng số này để xếp hạng thị trường |

## Công thức sản phẩm

**Cường độ quảng cáo + độ bền + đa dạng creative + proxy bán hàng ngoài Facebook = điểm “đáng để soi”.**

Điểm nóng luôn hiển thị chú thích “ước lượng”. Proxy bán chỉ từ **đã bán sàn** (Shopee / TikTok / Lazada / Tiki / Sendo) user nhập — không phải đơn Facebook. Lượt xem YouTube và ads Google/YouTube/TikTok đếm tay **không** vào HeatScore.

## Giá bán cạnh tên sản phẩm

Ước lượng tương đối, không crawl sàn / Facebook:

1. **Bạn nhập** khi lưu thẻ (Shopee / TikTok / landing) — độ tin cao.
2. **Đọc VND từ nội dung ads** (189.000đ, 189k, 1.2 triệu) — độ tin vừa.
3. **Khoảng giá catalog** theo ngành + từ khóa — độ tin thấp, khi chưa có số.

Không pretends đây là giá live hay giá đối thủ chính xác.

## Theo dõi tên sản phẩm

User ghi một tên **hoặc từ khóa trong nội dung ads** → Radar khớp cụm + title/body đã lưu → đếm **bài đang chạy / số trang / bài đã lưu**. Đồng thời sinh URL Thư viện (VN, đang chạy) và biến thể tên để bắt thêm thẻ. Chỉ trên dữ liệu đã lưu + search chính thức — không phải tổng ads Facebook.

Danh mục khóa: **26 ngành / 13 nhóm**. “Quét đầy đủ” = hàng đợi **cành từ khóa** (`/quet`) + ~1.000.000 ô tìm tên sản phẩm mở rộng (tổ hợp lexicon VN, phân trang) + biến thể tên + cụm rút từ bài ads đã lưu. User tự mở Thư viện — không scrape Facebook. Bảng xếp hạng không bao giờ là tổng ads Facebook.

## Soi thẻ đã lưu (học UX, không copy kho ads)

Trên dữ liệu user đã lưu (+ feed licensed nếu có), Radar có các bề mặt kiểu EachSpy / Kalodata / Foreplay — **không** index hàng triệu ads:

0. **Ad Library chrome** — theme sáng, KPI strip + ma trận 9 nền tảng trên trang chủ. Sidebar nhóm **Nền tảng / Phân tích / Kho**. Pill header và chrome chỉ Shopee → Instagram (href `/kenh/…`) — **không** có nút X / Pinterest / Visual Search / E-commerce·Game·Tool giả. Logo **Radar**.
1. **Hồ sơ sản phẩm** `/san-pham/[slug]` — mọi thẻ, trang, landing/shop đã dán, góc creative, URL tìm Thư viện.
2. **Trending / Fresh** `/xu-huong` — mặc định Shopee: 999 tên nghiên cứu mọi nền tảng + kho đã lưu; lưới Facebook phía dưới chỉ thẻ đã lưu (điểm nóng / Fresh ≤ 7 ngày).
2b. **Ads mạnh nhất** `/manh` — playbook hợp pháp + bảng sản phẩm đạt ngưỡng mạnh trên kho đã lưu (điểm nóng ≥ 40 hoặc độ bền ≥ 50 và ≥ 2 ads đang chạy). Không có dump Facebook toàn quốc.
2c. **Tổng hợp đa kênh** `/tong-hop` + **ma trận nền tảng** trên trang chủ và `/kenh/[nền-tảng]` — ads Facebook đã lưu + đã bán sàn + ads Google/YouTube/TikTok user đếm + views YouTube. Tính lại liên tục từ kho; không crawl. Không có dump bán chạy toàn quốc. Chi tiết [CHANNELS.md](./CHANNELS.md).
2d. **999 tên nghiên cứu / kênh** `/top/[nền-tảng]` — catalog sâu (không phải GMV live). Cùng 999 tên, xếp lại theo ngành ưu tiên từng sàn / ads. Overlay số kho khi khớp mạnh tiêu đề. Phân trang 50. API `GET /api/top`.
3. **Lưới creative** `/?view=grid` — hover hiện hook từ copy đã lưu.
4. **Bộ lọc** trên `/` — ngày chạy, số trang, landing, Shopee/TikTok/Lazada/Tiki/Sendo/YouTube/web, góc, media, giá, shop key, làn.
5. **Watch Page** `/theo-doi` — cảnh báo khi user lưu thẻ mới từ trang đó (không crawl 24/7).
6. **Shop / landing** — phân loại URL user dán; lọc `?shop=`.
7. **Bộ sưu tập** `/bo-suu-tap` + nhãn góc trên thẻ (swipe file).
8. **Hook digest** trên `/xu-huong` — cụm 2–3 từ từ title/body đã lưu.
9. **Extension unpacked** `extension/` + bookmarklet — chỉ mở `/collect?url=`.
10. **Feed licensed** — nút nhập trên `/collect` qua port sẵn có.

Không copy: scrape/index triệu ads; giả spend/ROAS; harvest pixel; `/ads_archive` cho ads bán hàng VN.

## Thu thập hợp lệ

1. User dán URL Ad Library hoặc JSON snapshot họ copy.
2. Bookmarklet chỉ mở form với URL trang user đang xem — server **không** fetch Facebook.
3. `/quet` sinh URL search chính thức (`active_status=active`, `country=VN`) cho hàng trăm cành ưu tiên và ~1.000.000 ô tìm mở rộng (không phải ads đã kéo). User mở Meta, rồi lưu thẻ. Radar đánh dấu cành đã khớp dữ liệu đã lưu.
4. Nhập CSV sheet (`docs/v0/ad-library-sheet.template.csv`) qua `/api/collect/sheet` — cùng cổng collect, khóa `x-fmr-key`.
5. Marketing API: insights của ad account user (token không log).
6. Licensed feed: file / JSON dán / HTTPS vendor đã mua (`IAdIndexProvider` source=`licensed`). Cấm URL Facebook.
7. Catalog nguồn: `/nguon` + `docs/SOURCES.md` — cái gì đồng bộ được, cái gì Meta không trả, cái gì cấm.
8. Chỉ số kênh ngoài Facebook: form `/collect`, hàng đợi `/kenh/*`, `POST /api/kenh`, sheet, feed licensed, YouTube Data API cho video ID đã lưu (`POST /api/youtube-views`). User tự đọc listing / Transparency — không crawl. “Có đích” ≠ “có số”. Views YouTube không vào HeatScore.

Không scrape `facebook.com/ads/library`, Google Ads Transparency, YouTube, hay sàn TMĐT. Không gọi `/ads_archive` để lấy ads bán hàng VN (API chỉ trả chính trị toàn cầu + commercial đã reach EU/UK).

## Ngoài phạm vi Vòng 1

- SaaS multi-region, Chrome Web Store listing (extension **unpacked** trong repo thì được)
- CASD / Meta Content Library (cấm dùng thương mại)
- Gọi `/ads_archive` như thể đó là kho ads bán hàng VN
- Ước đoán spend giả như số thật
- Gắn vào monorepo education cores
