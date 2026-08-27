# Facebook Market Radar (VN) — phạm vi khóa

Sản phẩm **độc lập**. Không phải App #2 của edu-commerce-platform. Không tái sử dụng Payment / Entitlement / AdMob / Access Engine.

## Hai bề mặt (không trộn số)

| Bề mặt | Nguồn | User thấy | Cấm |
|--------|--------|-----------|-----|
| **Radar thị trường** | User lưu Ad Library + (sau này) feed có giấy phép | Cường độ, Độ bền, Tốc độ mới, Proxy bán, Điểm nóng **ước lượng** | Doanh thu / tỷ suất / chi phí đối thủ |
| **Ads của tôi** | Marketing API tài khoản user kết nối | Spend, impression, purchase, ROAS **của họ** | Dùng số này để xếp hạng thị trường |

## Công thức sản phẩm

**Cường độ quảng cáo + độ bền + đa dạng creative + proxy bán hàng ngoài Facebook = điểm “đáng để soi”.**

Điểm nóng luôn hiển thị chú thích “ước lượng”. Proxy bán chỉ từ Shopee/TikTok/user nhập — không phải đơn Facebook.

Danh mục khóa: **26 ngành / 13 nhóm**. “Quét đầy đủ” = độ phủ danh mục + từ khóa để user tự tìm trên Thư viện — không scrape Facebook.

## Thu thập hợp lệ

1. User dán URL Ad Library hoặc JSON snapshot họ copy.
2. Bookmarklet chỉ mở form với URL trang user đang xem — server **không** fetch Facebook.
3. Marketing API: insights của ad account user (token không log).
4. Licensed feed: file/JSON đã mua, qua `IAdIndexProvider` source=`licensed`.

Không scrape `facebook.com/ads/library`. Không gọi `/ads_archive` để lấy ads bán hàng VN (API không trả commercial VN).

## Ngoài phạm vi Vòng 1

- SaaS multi-region, Chrome Web Store extension đầy đủ
- CASD / Meta Content Library
- Ước đoán spend giả như số thật
- Gắn vào monorepo education cores
