# Facebook Market Radar — sibling product

Standalone VN ad-market radar lives in [`facebook-market-radar/`](../facebook-market-radar/). It is **not** App #2 of this education platform. UI tiếng Việt; 26 ngành hàng; `/quet` hàng đợi cành + ~1.000.000 ô tìm tên sản phẩm mở rộng + tìm bài đang chạy theo tên / từ khóa trong nội dung ads (URL Thư viện chính thức); ảnh + giá ước lượng cạnh tên; thống kê ngành từ dữ liệu user lưu — không scrape Facebook / Shopee / TikTok. Bảng xếp hạng ≠ tổng ads Facebook. Soi thẻ đã lưu: hồ sơ `/san-pham/[slug]`, `/xu-huong`, lưới creative, bộ lọc, watch page, bộ sưu tập, hook digest, extension unpacked — không index triệu ads.

- Product lock: [`facebook-market-radar/docs/PRODUCT.md`](../facebook-market-radar/docs/PRODUCT.md)
- Vòng 0 validation: [`facebook-market-radar/docs/v0/README.md`](../facebook-market-radar/docs/v0/README.md)
- Data ports: [`facebook-market-radar/docs/DATA.md`](../facebook-market-radar/docs/DATA.md)
- VPS (Nginx + systemd, no secrets): [`facebook-market-radar/docs/DEPLOYMENT.md`](../facebook-market-radar/docs/DEPLOYMENT.md)

Do not add Meta Ad Library scraping, competitor ROAS, or FMR tables to `packages/database` / Monetization Core.
