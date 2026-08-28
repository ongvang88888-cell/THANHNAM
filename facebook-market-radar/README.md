# Facebook Market Radar (VN)

Công cụ thống kê thị trường quảng cáo Facebook tại Việt Nam bằng **tín hiệu gián tiếp**. Không đọc được doanh số / ROAS đối thủ.

Sản phẩm độc lập — không phải module của Education Commerce Platform.

## Chạy local

```bash
cd facebook-market-radar
cp .env.example .env
pnpm install   # hoặc từ repo gốc: pnpm install
pnpm db:generate
pnpm db:push
pnpm db:seed
pnpm test
pnpm dev       # http://127.0.0.1:3100
```

SQLite file: `prisma/dev.db` (không đụng Postgres edu-commerce).

## VPS

Hướng dẫn Nginx + systemd (không chứa mật khẩu): [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md).

## Việc làm trước khi tin UI

Đọc [docs/v0/README.md](./docs/v0/README.md) và [docs/PRODUCT.md](./docs/PRODUCT.md).

Hàng đợi quét: `/quet` — mở URL Thư viện (VN, đang chạy) theo cành catalog, biến thể tên, và từ khóa trong bài ads đã lưu. Ô tìm trên `/quet?ten=` khớp tên + nội dung ads. Radar không tự kéo Facebook.

## Scripts

| Script | Mục đích |
|--------|----------|
| `pnpm test` | Unit test domain + adapters |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm dev` | Next.js :3100 |
| `pnpm db:seed` | 26 ngành + ảnh sản phẩm + mẫu thống kê + cảnh báo |
