# Market research → proposals to lock (before next build)

**Date:** 2026-08-25  
**Purpose:** Compare similar products, extract features that actually move revenue/retention, and propose decisions to lock — **no implementation until you choose**.

**Sources (patterns only):** Unica / Edumall / Kyna / Gitiho (VN); Teachable / Thinkific / Kajabi / Udemy (global); Ruzuku / Kajabi cohort drip research; existing `architecture/05-FEATURE_MAP.md`, `DECISIONS_D1_D5.md`.

---

## 1. Ba mô hình thị trường (chọn “ai mình cạnh tranh”)

| Mô hình | Ví dụ | Cách kiếm tiền | Điểm mạnh | Điểm yếu |
|---------|--------|----------------|-----------|----------|
| **A. Marketplace** | Unica, Edumall, Kyna, Udemy | Hoa hồng / flash sale / affiliate mạnh | Traffic sẵn, discovery | Giá bị ép xuống, brand kém, hoàn tiền / quality lệch |
| **B. Creator / school platform** | Teachable, Thinkific, Kajabi, Podia | SaaS + bạn giữ margin | Kiểm soát giá, data học viên, brand | Phải tự marketing |
| **C. Enterprise LMS** | Gitiho for Business, Moodle corporate | Seat / license B2B | Lộ trình, assign, báo cáo HR | UX “học bán lẻ” kém, ít storefront |

**Sản phẩm của bạn (theo architecture hiện tại):** gần **B + một phần A/C sau này**  
- Commerce + learning + multi-app `app_id` + VN payments + mobile store IAP  
- **D4 marketplace split = OFF** → chưa cạnh tranh Unica kiểu “chợ”  
- Rewarded ads = khác biệt so với Teachable/Unica (VN freemium)

**Hệ quả chiến lược:** đừng copy Unica full marketplace trước. Copy **cách họ bán + giữ học viên** trên nền **creator school** (Thinkific/Kajabi), rồi mới mở marketplace khi catalog/quality đủ.

---

## 2. Tính năng đối thủ dùng — và hiệu quả thực tế

### 2.1 Commerce / tăng doanh thu (cao ROI)

| Tính năng | Ai dùng mạnh | Vì sao hiệu quả | Bạn đã có? | Đề xuất |
|-----------|--------------|-----------------|------------|---------|
| **Flash sale / countdown campaign** | Unica (flash định kỳ), Udemy site-wide discount | Urgency → conversion spike | Coupon tĩnh | **Nên làm** campaign layer (starts/ends + badge UI) |
| **Coupon gắn affiliate** | Unica (mã AFF = giảm giá + attribution) | Aff tự bán vì coupon có lợi cho buyer | Coupon + affiliate tách | **Nên làm** option “coupon is also affiliate code” |
| **Cookie / last-click window 30 ngày** | Unica Affiliate | Attribution bền sau click | Chỉ gắn lúc checkout | **Nên làm** attribution cookie/device window |
| **Affiliate payout schedule** | Unica (ngày 15, min rút) | Aff tin hệ thống → scale kênh | Ledger PENDING/EARNED/REVERSED | **Nên làm** payout request + admin approve |
| **Bundles / order bump** | Thinkific, Teachable, Unica combo | AOV ↑ | Bundle product | **Nên làm** checkout upsell / “add to cart” bump |
| **Payment plans / installments** | Teachable, Kajabi | Giảm friction giá cao | Chưa | **Could** sau subscription |
| **Abandoned checkout recovery** | Kajabi (email automation) | Recover lost carts | Chưa | **Should** email/push khi AWAITING_PAYMENT quá X phút |
| **Subscriptions / membership** | Coursera Plus, Thinkific, Kajabi | LTV ổn định | Schema + stub | **Should** live billing + library access |
| **Gift purchase** | Teachable | Seasonal GMV | F trong map | **Defer** |
| **Marketplace instructor split** | Unica / Udemy | Scale supply | D4 OFF | **Giữ OFF** đến Phase D |

### 2.2 Learning / completion (giữ học viên → review → repurchase)

Nghiên cứu (Ruzuku ~50k enrollments; cohort literature):

- Community discussion: completion **~65.5%** vs **~42.6%** không có thảo luận  
- Cohort / scheduled: **~64%** vs open-access **~48%**  
- Self-paced MOOC median completion **~12.6%**  
→ **Community + lịch + nhắc** hiệu quả hơn “thêm video dài”.

| Tính năng | Hiệu quả | Bạn đã có? | Đề xuất |
|-----------|----------|------------|---------|
| **Drip (sau mua / theo ngày lịch)** | Chống binge, giữ nhịp | Chưa (map S) | **Must-next learning** |
| **Prerequisites** | Chất lượng học | Chưa (map S) | **Must-next** cùng drip |
| **Completion reminders / inactivity nudge** | +engagement rõ | Notification cơ bản | **Must-next** (3–5 ngày idle) |
| **Quiz sau module** | Kiểm tra + giữ | Quiz basic | **Polish** gắn lesson + certificate gate |
| **Certificate + verify page** | Social proof / share | Schema/docs | **Should** ship UI end-to-end |
| **Continue learning + progress bar** | Baseline UX | Có | Giữ / polish mobile |
| **Announcements từ teacher** | Instructor presence | Chưa | **Should** |
| **Q&A / discussion per lesson** | Completion lớn | C trong map | **Could** (MVP nhẹ: comment thread) |
| **Cohort + live calendar** | Completion rất cao | Future | **Future** (sau drip + announce) |
| **Streak / daily goal** | Habit | C | **Could** nhẹ nếu có push |
| **Offline download** | Mobile retention | C | **Defer** (DRM phức tạp) |

### 2.3 Acquisition / growth

| Tính năng | Ai | Hiệu quả | Đề xuất |
|-----------|-----|----------|---------|
| **Free preview lessons** | Tất cả | Trust trước mua | Đã M — giữ chất lượng preview |
| **Reviews + rating** | Unica, Udemy | Conversion | Đã có API — **polish storefront** |
| **SEO storefront** | Thinkific, Unica | Organic | **Should** meta/OG/sitemap |
| **Rule-based recommendations** | Mọi store lớn | AOV / discovery | **Should** (đã có architecture port) |
| **Rewarded ads unlock** | Bạn (khác biệt) | Top-of-funnel VN | **Giữ + đo funnel** (xem ad → paid) |
| **Teacher self-serve marketing** | Kajabi funnels | Creator GMV | **Defer** full funnel; **Could** share link + coupon |

### 2.4 Teacher / ops (B2B-lite, Gitiho-style — chỉ nếu đi doanh nghiệp)

| Tính năng | Khi nào cần | Đề xuất |
|-----------|-------------|---------|
| Learning path assign | Bán cho công ty | **Future** trừ khi lock B2B |
| Workflow auto-assign | HR LMS | **Future** |
| Revenue dashboard teacher | Creator school | **Should** sớm (doanh thu / hoàn / affiliate) |
| Content review queue | Marketplace quality | Đã có publish flow — **giữ** |

---

## 3. Gap so với bạn (đã ship P0–P3 + gaps)

**Đã mạnh (commerce nền):** checkout đa provider (Stripe/VNPay/MoMo/ZaloPay/Play/Apple), fulfill/refund ổn định, coupon, affiliate ledger, entitlements, rewarded SSV, media pipeline.

**Còn yếu so với đối thủ “đang thắng tiền / giữ HS”:**

1. Campaign / flash (không chỉ coupon code)  
2. Affiliate attribution window + payout UX (chưa đủ Unica-level)  
3. Subscription live  
4. Drip + prerequisites + nudge completion  
5. Teacher announcements + nhẹ community  
6. Abandoned checkout recovery  
7. Recommendation trên storefront  
8. Certificate/quiz polish end-to-end  

---

## 4. Đề xuất chốt hướng đi (3 gói — chọn 1)

### Option **P4-A — Growth Commerce** (tăng GMV nhanh nhất)
Fokus: bán nhiều hơn với stack hiện tại.

1. Campaign / flash + badge countdown  
2. Affiliate: cookie last-click 30d + coupon-as-ref + payout request  
3. Abandoned checkout email/push  
4. Checkout order bump / related bundle  
5. Reviews + recommendation trên product/home  

**Khớp:** Unica growth playbook + Kajabi recovery — **không** cần D4.

### Option **P4-B — Learning Retention** (tăng completion → LTV)
Fokus: học viên học xong → review → mua tiếp.

1. Drip + prerequisites  
2. Inactivity nudges + completion reminders  
3. Quiz gate + certificate verify ship  
4. Teacher announcements  
5. Lesson Q&A tối giản  

**Khớp:** Ruzuku/Kajabi cohort research (drip + presence trước full community).

### Option **P4-C — Membership** (ổn định LTV)
Fokus: gói tháng/năm truy cập library.

1. Subscription billing live (Stripe + optional VNPay recurring/manual renew)  
2. Premium library entitlement  
3. Member-only catalog surface  
4. Upgrade/downgrade + grace on fail  

**Khớp:** Coursera Plus / Thinkific membership — cần billing ops rõ.

---

## 5. Khuyến nghị mặc định (nếu bạn muốn một hướng)

**Chốt P4-A trước (4–6 épíc nhỏ), song song 2 mục P4-B tối thiểu:**

| # | Việc | Lý do |
|---|------|--------|
| 1 | **Campaign/flash** | Unica chứng minh: urgency = conversion VN |
| 2 | **Affiliate window + payout** | Aff là kênh rẻ nhất VN; ledger đã có |
| 3 | **Abandoned checkout nudge** | Kajabi: recover cart không cần funnel full |
| 4 | **Drip + idle reminder** | Completion thấp giết LTV dù bán được |
| 5 | **Subscription live** | Ngay sau A nếu GMV ổn — đừng song song quá nhiều |

**Giữ OFF / chưa chốt:**

- Marketplace revenue split (D4)  
- Full community / cohort live calendar  
- Enterprise learning paths (Gitiho) trừ khi pivot B2B  
- Gift, offline DRM, ML recommend  

---

## 6. Câu hỏi cần bạn chốt (trả lời để bắt đầu code)

1. **Primary ICP 6 tháng tới:** creator bán khóa lẻ / marketplace mở / B2B LMS?  
2. **Chọn gói:** P4-A / P4-B / P4-C / mix A+B tối thiểu như khuyến nghị?  
3. **Affiliate payout:** có chi tiền thật trong staging (bank transfer manual) hay chỉ ledger?  
4. **Subscription:** Stripe-first có chấp nhận (VN card) hay bắt buộc cổng VN recurring?  
5. **Community:** comment theo lesson có chấp nhận, hay chỉ announcements?

---

## 7. Ma trận “làm / không làm” nhanh

| Làm sớm (hiệu quả cao) | Làm sau | Không làm (hiện tại) |
|------------------------|---------|----------------------|
| Flash/campaign | Full cohort | Marketplace split |
| Aff cookie + payout | Payment plans | White-label funnel Kajabi-level |
| Abandoned checkout | Streak/gamification | Offline video DRM |
| Drip + nudge | OpenSearch | AI tutor full |
| Sub live (sau A) | Enterprise paths | Gift |
| Announce + cert polish | Lesson Q&A sâu | Teacher mobile |

Khi bạn trả lời mục **§6**, bước tiếp theo là lock amendment ngắn vào `architecture/` rồi mới implement.
