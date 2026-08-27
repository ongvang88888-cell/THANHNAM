# Facebook Market Radar — sibling product

Standalone VN ad-market radar lives in [`facebook-market-radar/`](../facebook-market-radar/). It is **not** App #2 of this education platform. UI tiếng Việt; 26 ngành hàng; ảnh + giá ước lượng cạnh tên; ghi tên sản phẩm để đếm bài ads đang chạy; thống kê ngành đang chạy mạnh từ dữ liệu user lưu — không scrape Facebook / Shopee / TikTok.

- Product lock: [`facebook-market-radar/docs/PRODUCT.md`](../facebook-market-radar/docs/PRODUCT.md)
- Vòng 0 validation: [`facebook-market-radar/docs/v0/README.md`](../facebook-market-radar/docs/v0/README.md)
- Data ports: [`facebook-market-radar/docs/DATA.md`](../facebook-market-radar/docs/DATA.md)
- VPS (Nginx + systemd, no secrets): [`facebook-market-radar/docs/DEPLOYMENT.md`](../facebook-market-radar/docs/DEPLOYMENT.md)

Do not add Meta Ad Library scraping, competitor ROAS, or FMR tables to `packages/database` / Monetization Core.
