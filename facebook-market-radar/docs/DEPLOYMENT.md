# Facebook Market Radar — triển khai VPS

Standalone Next.js + SQLite. Không dùng Postgres / Payment / Entitlement của edu-commerce.

Không ghi mật khẩu, `FMR_COLLECT_KEY`, token Meta, hay IP máy chủ vào git.

## Yêu cầu

- Ubuntu 20.04+ (20.04 LTS đã EOL — nên nâng 22.04/24.04 khi rảnh)
- Node.js 20 (không dùng pnpm 11: bản đó cần Node 22)
- `pnpm@9.15.0` (cài bằng `npm install -g pnpm@9.15.0 --force`, tránh Corepack kéo bản mới nhất)
- Nginx + systemd + UFW

## Bố trí trên máy chủ

| Thành phần | Đường dẫn / lệnh |
|------------|------------------|
| Mã nguồn | `/opt/facebook-market-radar` |
| User chạy app | `fmr` (nologin, home = thư mục app) |
| SQLite | `prisma/dev.db` (`FMR_DATABASE_URL=file:./dev.db`) |
| Env | `/opt/facebook-market-radar/.env` (chmod 600, owner `fmr`) |
| systemd | `facebook-market-radar.service` |
| Nginx | cổng 80 → `http://127.0.0.1:3100` |
| App bind | `127.0.0.1:3100` — **không** mở UFW 3100 |

UFW chỉ mở 22 / 80 / 443.

## `.env` (không commit)

Sao chép từ `.env.example`. Production cần:

```
FMR_DATABASE_URL=file:./dev.db
FMR_APP_ID=fmr_vn
FMR_COLLECT_KEY=<random hex, openssl rand -hex 16>
NODE_ENV=production
PORT=3100
```

`META_*` để trống trừ khi user tự kết nối Marketing API (ads của chính họ — không trộn vào HeatScore thị trường).

Ghi quảng cáo (`POST /api/collect`, `POST /api/theo-doi`) cần header `x-fmr-key` trùng `FMR_COLLECT_KEY`.

## systemd (mẫu)

`ExecStart` gọi Next trực tiếp, bind localhost:

```
ExecStart=/usr/bin/pnpm exec next start -p 3100 -H 127.0.0.1
WorkingDirectory=/opt/facebook-market-radar
User=fmr
EnvironmentFile=/opt/facebook-market-radar/.env
Environment=HOME=/opt/facebook-market-radar
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now facebook-market-radar
sudo systemctl status facebook-market-radar
```

## Nginx (mẫu)

`proxy_pass http://127.0.0.1:3100;` trên `listen 80`. Bật site, tắt default, `nginx -t` rồi reload.

HTTPS: trỏ domain rồi `certbot --nginx`. Không bắt buộc cho IP thuần.

## Cài lần đầu / cập nhật mã

Từ máy có source (loại `node_modules`, `.next`, `*.db`, `.env`):

```bash
sudo tar -xzf fmr.tgz -C /opt
# giữ .env cũ
cd /opt/facebook-market-radar
sudo pnpm install
sudo pnpm db:generate
sudo pnpm db:push
# seed chỉ lần đầu (ghi đè dữ liệu mẫu)
sudo pnpm db:seed
sudo pnpm build
sudo chown -R fmr:fmr /opt/facebook-market-radar
sudo systemctl restart facebook-market-radar
```

`prisma db push` với `file:./dev.db` tạo `prisma/dev.db`. App bỏ qua file SQLite 0 byte ở cwd.

## Kiểm tra

```bash
curl -I http://127.0.0.1:3100/
curl -I http://127.0.0.1/
```

Trình duyệt: trang chủ xếp hạng, `/theo-doi`, `/collect`. Điểm nóng và giá luôn là **ước lượng**.

## Bảo mật

- Đổi mật khẩu `root` ngay nếu từng gửi qua chat/email
- Không commit `.env` / `*.db`
- Không scrape `facebook.com/ads/library`, Shopee, TikTok
- Backup: copy `prisma/dev.db` khi đã có dữ liệu thật (Vietnix order mặc định không kèm backup)
