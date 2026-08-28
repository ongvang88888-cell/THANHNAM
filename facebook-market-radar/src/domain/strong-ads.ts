import { STRONG_HEAT, STRONG_LONGEVITY, isStrongProduct } from "./industry-stats";
import type { RankingRow } from "./weekly-report";

export { STRONG_HEAT, STRONG_LONGEVITY };

export type StrongFindMethodId = "ad_library_manual" | "radar_warehouse" | "licensed_feed";

export type StrongFindMethod = {
  id: StrongFindMethodId;
  titleVi: string;
  howVi: string;
  limitVi: string;
};

/** Legal ways to find products with strong running ads. None scrape Facebook. */
export const STRONG_FIND_METHODS: readonly StrongFindMethod[] = [
  {
    id: "ad_library_manual",
    titleVi: "Soi Thư viện quảng cáo Meta (VN, đang chạy)",
    howVi:
      "Mở URL search chính thức từ /quet, chọn quốc gia Việt Nam và trạng thái Đang chạy. Ưu tiên thẻ ngày bắt đầu đã lâu mà vẫn Active, cùng sản phẩm trên nhiều Page, hoặc nhiều creative. Rồi lưu thẻ vào Radar.",
    limitVi:
      "Thư viện không có nút xếp “ads mạnh nhất” hay spend/ROAS. Graph /ads_archive không dump ads bán hàng VN.",
  },
  {
    id: "radar_warehouse",
    titleVi: "Xếp kho thẻ đã lưu theo điểm nóng",
    howVi:
      "Radar cộng cường độ (số ads + số page + biến thể), độ bền (tuổi ads đang chạy), tốc độ mới (thẻ 7 ngày) và proxy bán Shopee/TikTok bạn nhập. Sản phẩm mạnh = điểm nóng ≥ 40, hoặc độ bền ≥ 50 và ≥ 2 ads đang chạy.",
    limitVi: "Chỉ trên thẻ bạn đã lưu + feed licensed. Không phải bảng Facebook toàn quốc.",
  },
  {
    id: "licensed_feed",
    titleVi: "Nhập feed/API đã mua giấy phép",
    howVi:
      "Nếu hợp đồng vendor cho xuất JSON/CSV, nhập qua /collect hoặc /nguon. Radar xếp cùng công thức — không trộn Marketing API tài khoản của bạn vào bảng thị trường.",
    limitVi: "Vendor cũng không có doanh số Facebook đối thủ. Điểm nóng vẫn ước lượng.",
  },
];

export type StrongLookForId = "active_old_start" | "many_pages" | "many_creatives" | "new_burst";

export type StrongLookFor = {
  id: StrongLookForId;
  titleVi: string;
  howVi: string;
  mapsTo: "longevity" | "intensity" | "velocity";
};

export const STRONG_LOOK_FOR: readonly StrongLookFor[] = [
  {
    id: "active_old_start",
    titleVi: "Ngày bắt đầu cũ + vẫn đang chạy",
    howVi:
      "Trên thẻ Ad Library, xem ngày bắt đầu. Thẻ Active từ 14–60+ ngày là tín hiệu độ bền — ads lỗ thường bị tắt sớm.",
    mapsTo: "longevity",
  },
  {
    id: "many_pages",
    titleVi: "Cùng sản phẩm trên nhiều Page",
    howVi: "Nhiều shop/page khác nhau chạy cùng SKU = cường độ thị trường, không chỉ một brand đang test.",
    mapsTo: "intensity",
  },
  {
    id: "many_creatives",
    titleVi: "Nhiều creative / góc",
    howVi: "Nhiều ảnh, hook, góc giá / UGC / before-after cho cùng sản phẩm = đang scale thử nghiệm.",
    mapsTo: "intensity",
  },
  {
    id: "new_burst",
    titleVi: "Nhiều thẻ mới trong 7 ngày",
    howVi: "Burst creative mới = tốc độ. Chưa bền thì xếp Fresh, chưa gọi là mạnh.",
    mapsTo: "velocity",
  },
];

export type StrongProductReason = {
  byHeat: boolean;
  byLongevity: boolean;
  labelVi: string;
};

export function strongProductReason(row: RankingRow): StrongProductReason {
  const byHeat = row.scores.heat >= STRONG_HEAT;
  const byLongevity = row.scores.longevity >= STRONG_LONGEVITY && row.activeAdCount >= 2;
  const parts: string[] = [];
  if (byHeat) {
    parts.push(`điểm nóng ${row.scores.heat} ≥ ${STRONG_HEAT}`);
  }
  if (byLongevity) {
    parts.push(`độ bền ${row.scores.longevity} ≥ ${STRONG_LONGEVITY} và ${row.activeAdCount} ads đang chạy`);
  }
  return {
    byHeat,
    byLongevity,
    labelVi: parts.length > 0 ? parts.join(" · ") : "chưa đạt ngưỡng mạnh",
  };
}

export function compareStrongProducts(a: RankingRow, b: RankingRow): number {
  return (
    b.scores.heat - a.scores.heat ||
    b.scores.longevity - a.scores.longevity ||
    b.activeAdCount - a.activeAdCount ||
    b.distinctPageCount - a.distinctPageCount ||
    a.clusterTitle.localeCompare(b.clusterTitle, "vi")
  );
}

export function rankStrongProducts<T extends RankingRow>(rows: readonly T[]): T[] {
  return rows.filter(isStrongProduct).sort(compareStrongProducts);
}
