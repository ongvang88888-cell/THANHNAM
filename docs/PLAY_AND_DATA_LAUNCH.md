# Xuất bản Play + lưu dữ liệu bán hàng

Tài liệu này là trình tự vận hành. Agent đã hoàn tất phần **trong repo**. Các bước có dấu **[BẠN]** cần tài khoản, tiền, hoặc secret thật — không ai có thể click hộ trên Play/AWS từ máy này.

Dữ liệu khóa học và khách hàng **không** nằm trong file AAB. Chúng nằm trên API + PostgreSQL (+ S3/MediaConvert cho video). Google Play chỉ phân phối app.

## Đã có trong repo

- App production từ chối `127.0.0.1` khi `EAS_BUILD_PROFILE=production` (`apps/mobile-student/app.config.js`)
- API production yêu cầu `PUBLIC_WEB_URL` https; `SELL_ON_PLAY=true` mới bắt buộc Play service account
- `/privacy` `/terms` `/data-deletion` + footer
- Listing / Data safety / SKU: `store/play/`
- `scripts/ops/check-production-env.sh`, `backup-postgres.sh`, `restore-postgres.sh`
- `docker-compose.prod.yml` có restart + volume + sidecar backup
- Web image nhận `NEXT_PUBLIC_API_URL` lúc build
- Caddy mẫu: `deploy/caddy/Caddyfile`

## Trình tự — làm đúng thứ tự

### 1. Domain + TLS **[BẠN]**

1. Mua/trỏ domain về máy chủ (AWS ALB hoặc VPS).
2. Cấp chứng chỉ HTTPS.
3. Ghi origin, ví dụ `https://school.example.com`.
4. Điền `PUBLIC_WEB_URL`, `CORS_ORIGINS`, `NEXT_PUBLIC_API_URL=https://…/api/v1` trong `.env` (xem `.env.production.example`).

Không invent domain trong git.

### 2. PostgreSQL bền **[BẠN]**

**Khuyến nghị (lock D2):** AWS RDS PostgreSQL `ap-southeast-1`, bật PITR.

**Tạm VPS:** `docker compose -f docker-compose.prod.yml up -d` sau khi `.env` đạt check.

```bash
cp .env.production.example .env
# sửa secret + URL thật
bash scripts/ops/check-production-env.sh .env
pnpm db:generate
# migrate/push chỉ khi bạn chấp nhận schema trên DB đó
```

Backup:

```bash
export DATABASE_URL=…   # URL production
export BACKUP_DIR=./backups/postgres
bash scripts/ops/backup-postgres.sh
```

Restore (xóa dữ liệu hiện tại):

```bash
RESTORE_CONFIRM=YES DATABASE_URL=… bash scripts/ops/restore-postgres.sh backups/postgres/FILE.sql.gz
```

### 3. API + web lên HTTPS

1. `STORAGE_DRIVER` không được `memory`.
2. Cổng thanh toán web: điền secret VNPay/MoMo/ZaloPay/Stripe cho rail mặc định.
3. `SMTP_HOST` — nếu trống, email xác minh/reset/biên lai không ra ngoài.
4. Health: `GET /api/v1/health` và `GET /api/v1/ready` (ready ping Redis khi có `REDIS_URL`).
5. Mở `/privacy` `/terms` `/data-deletion` trên origin công khai.

VPS TLS tùy chọn: Caddy với `PUBLIC_DOMAIN`, proxy `/api/*` → `:3001`, còn lại → `:3000`.

AWS ECS/RDS/S3/MediaConvert: xem `docs/DEPLOYMENT.md`. Không dùng `npx convex deploy`.

### 4. Google Play Developer **[BẠN]**

1. Tài khoản Play Console (phí đăng ký một lần của Google).
2. Tạo ứng dụng `com.educommerce.student`.
3. Dán listing từ `store/play/listing-vi.md` (và `listing-en.md` nếu cần).
4. Data safety theo `store/play/data-safety.yml`.
5. Privacy policy URL = `{PUBLIC_WEB_URL}/privacy`.
6. Account deletion URL = `{PUBLIC_WEB_URL}/data-deletion`.
7. Tạo Managed product khớp `store/play/in-app-products.json` (`typescript_fundamentals`, `ts_cheat_sheet`).
8. Tạo Google Cloud service account, cấp quyền Android Publisher, tải JSON.
9. Trên API: `SELL_ON_PLAY=true`, `GOOGLE_PLAY_PACKAGE_NAME`, `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` (một dòng JSON), `ALLOW_IAP_TEST_TOKENS` không được `true`.
10. File JSON để submit EAS: `apps/mobile-student/google-play-service-account.json` (đã gitignore).

### 5. Expo / EAS **[BẠN]**

1. `npx eas-cli login` rồi `eas init` trong `apps/mobile-student`.
2. Thay `extra.eas.projectId` trong `app.json` (hiện là `replace-with-eas-project-id`).
3. Secret:

```bash
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_API_URL --value https://YOUR-DOMAIN/api/v1 --type string
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_APP_ID --value education_app --type string
```

4. `npx eas-cli build -p android --profile production` — profile này bật `EXPO_PUBLIC_NATIVE_IAP=1` và **fail** nếu API URL là localhost / http.
5. Cài `react-native-iap` trên build EAS nếu muốn Play Billing native (Expo Go không chạy IAP thật).
6. Internal track: `npx eas-cli submit -p android --profile production --latest` hoặc tải AAB lên Console.

### 6. Kiểm tra bán hàng (internal)

1. Tài khoản tester trên Play internal track.
2. Mua SKU seed; API confirm token thật (không `gp_test_*`).
3. Entitlement xuất hiện trong `/me/library`.
4. Web mua VNPay (nếu bán web) ghi cùng Postgres.
5. Backup một lần và thử restore trên DB trống riêng — không restore đè production để “thử”.

## Agent / máy này không thể làm

- Tạo tài khoản Google Play, trả phí, upload AAB
- `eas login` bằng tài khoản của bạn
- Tạo AWS account, RDS, ECS, secret live
- Mua domain / cấp Let’s Encrypt trên DNS của bạn
- Điền TMN/hash VNPay, MoMo, ZaloPay, Stripe live
- Đổi `privacy@edu.local` thành hộp thư thật (bạn sửa copy trên web + listing)

## Không làm (vẫn khóa)

- Marketplace split (D4 OFF)
- Ép email-verify lúc login khi seed demo chưa có `emailVerifiedAt`
- Hóa đơn điện tử GDT đầy đủ
- Đổi backend chính sang Railway/Vercel
- `npx convex deploy`
