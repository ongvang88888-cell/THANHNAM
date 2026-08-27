# Vòng 0 — Chứng minh nhu cầu (không viết platform)

Mục tiêu: mỗi tuần tự tay xem [Thư viện quảng cáo Meta](https://www.facebook.com/ads/library/) (quốc gia **VN**, loại **Tất cả quảng cáo**) và ghi vào sheet. Nếu báo cáo tuần không đổi quyết định nhập hàng / làm ads thì **đừng** xây SaaS.

## Ngách khóa (5)

Xem [niches.csv](./niches.csv):

1. `my-pham` — mỹ phẩm / skincare
2. `me-be` — mẹ và bé
3. `gadget` — gadget / nhà cửa
4. `tpcn` — thực phẩm chức năng / sức khỏe
5. `khoa-hoc` — khóa học / digital

## Việc làm mỗi tuần

1. Mở Ad Library, country = Vietnam, “Tất cả quảng cáo”.
2. Search 8–12 từ khóa / ngách (cột `searchKeywords` trong niches.csv).
3. Ghi 50–100 ads / ngách vào bản sao của [ad-library-sheet.template.csv](./ad-library-sheet.template.csv).
4. Nếu trùng sản phẩm trên Shopee/TikTok Shop: điền `shopeeSold` / `tiktokSold` (proxy ngoài Facebook, không phải doanh số ads).
5. Sinh báo cáo từ [weekly-report.template.md](./weekly-report.template.md).

## Tiêu chí “đáng làm Vòng 1”

Cả ba phải đúng:

- ≥10 sản phẩm ads bền ≥14 ngày mà team chưa biết
- Có quyết định nhập hàng / creative thay đổi nhờ bảng
- Có người chịu trả cho báo cáo tuần (dù 5–10 user)

## Mẫu đã điền (minh họa phương pháp)

- Sheet: [ad-library-sheet.sample.csv](./ad-library-sheet.sample.csv)
- Báo cáo tuần 2026-W34: [weekly-report.2026-W34.md](./weekly-report.2026-W34.md)

Các page / sản phẩm trong mẫu là **hư cấu**, chỉ để chạy phương pháp. Không lấy đây làm số thị trường thật.

## Việc cấm

- Scrape facebook.com hoặc gọi Graph API ngoài phạm vi app đã review
- Ghi “doanh thu Facebook” / ROAS đối thủ
- Trộn sản phẩm này vào edu-commerce-platform
