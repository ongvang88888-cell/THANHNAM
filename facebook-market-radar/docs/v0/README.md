# Vòng 0 — Chứng minh nhu cầu (không viết platform)

Mục tiêu: mỗi tuần tự tay xem [Thư viện quảng cáo Meta](https://www.facebook.com/ads/library/) (quốc gia **VN**, loại **Tất cả quảng cáo**) và ghi vào sheet. Nếu báo cáo tuần không đổi quyết định nhập hàng / làm ads thì **đừng** xây SaaS.

## Danh mục ngành (26)

Xem [niches.csv](./niches.csv). Radar khóa 13 nhóm: Làm đẹp, Sức khỏe, Gia đình, Nhà cửa, Điện máy, Thời trang, Ẩm thực, Xe cộ, Thể thao, Giáo dục, Giải trí, Nông nghiệp, Khác.

“Quét đầy đủ” = mở `/quet` (cành ưu tiên + ~1.000.000 ô tìm tên sản phẩm mở rộng), lần lượt search trên Thư viện, rồi lưu thẻ bạn thấy. **Không** scrape facebook.com. Số dòng trên bảng xếp hạng không phải tổng sản phẩm chạy ads.

## Việc làm mỗi tuần

1. Mở Ad Library, country = Vietnam, “Tất cả quảng cáo” — hoặc bấm **Mở Thư viện** trên `/quet`.
2. Search cành ưu tiên (ngành trống trước). Cột `searchKeywords` trong niches.csv vẫn dùng được; Radar còn thêm nhánh tên sản phẩm.
3. Ghi ads vào bản sao của [ad-library-sheet.template.csv](./ad-library-sheet.template.csv). Kèm URL ảnh nếu copy được.
4. Nếu trùng sản phẩm trên Shopee/TikTok Shop: điền `shopeeSold` / `tiktokSold` (proxy ngoài Facebook, không phải doanh số ads) và `listingPriceVnd` nếu nhìn thấy giá niêm yết (ước lượng, không crawl).
5. Trên Radar: gõ tên / từ khóa bài ads ở **Quét cành** hoặc **Theo dõi sản phẩm** để xem bài đang chạy trong dữ liệu đã lưu và mở URL Thư viện.
6. Sinh báo cáo từ [weekly-report.template.md](./weekly-report.template.md).

## Tiêu chí “đáng làm Vòng 1”

Cả ba phải đúng:

- ≥10 sản phẩm ads bền ≥14 ngày mà team chưa biết
- Có quyết định nhập hàng / creative thay đổi nhờ bảng
- Có người chịu trả cho báo cáo tuần (dù 5–10 user)

## Mẫu đã điền (minh họa phương pháp)

- Sheet: [ad-library-sheet.sample.csv](./ad-library-sheet.sample.csv)
- Báo cáo tuần 2026-W34: [weekly-report.2026-W34.md](./weekly-report.2026-W34.md)

Các page / sản phẩm trong mẫu là **hư cấu**, chỉ để chạy phương pháp. Không lấy đây làm số thị trường thật.

Nguồn nào Meta/vendor cho phép đồng bộ vào kho: [../SOURCES.md](../SOURCES.md) và UI `/nguon`.

## Việc cấm

- Scrape facebook.com hoặc gọi Graph API ngoài phạm vi app đã review
- Ghi “doanh thu Facebook” / tỷ suất đối thủ
- Trộn sản phẩm này vào edu-commerce-platform
