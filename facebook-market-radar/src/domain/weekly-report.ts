import type { IndustryStat } from "./industry-stats";
import type { ScoreBreakdown } from "./ports";
import type { PriceEstimate } from "./price";
import { isoWeekLabel } from "./week";

export type RankingRow = {
  clusterSlug: string;
  clusterTitle: string;
  nicheSlug: string;
  nicheName: string;
  activeAdCount: number;
  totalAdCount: number;
  distinctPageCount: number;
  imageUrls: string[];
  price: PriceEstimate;
  scores: ScoreBreakdown;
};

export type WeeklyReportInput = {
  nowMs: number;
  weekLabel?: string;
  adCount: number;
  pageCount: number;
  clusterCount: number;
  rankings: RankingRow[];
  industries?: IndustryStat[];
};

export function buildWeeklyReportMarkdown(input: WeeklyReportInput): string {
  const week = input.weekLabel ?? isoWeekLabel(input.nowMs);
  const top = [...input.rankings].sort((a, b) => b.scores.heat - a.scores.heat).slice(0, 20);
  const hot = (input.industries ?? []).filter((row) => row.isHot).slice(0, 12);
  const lines = [
    `# Báo cáo tuần Facebook Market Radar — ${week}`,
    "",
    "**Phạm vi:** Ad Library do user lưu + proxy ngoài Facebook.",
    "**Không phải:** doanh số / ROAS / CPA Facebook của đối thủ.",
    "",
    "## Tóm tắt",
    "",
    `- Số quảng cáo ghi nhận: ${input.adCount}`,
    `- Số trang: ${input.pageCount}`,
    `- Số sản phẩm: ${input.clusterCount}`,
    `- Ngành đang chạy mạnh: ${hot.length}`,
    "",
    "## Top sản phẩm theo Điểm nóng (ước lượng)",
    "",
    "| Hạng | Ngành hàng | Sản phẩm | Giá (ước lượng) | Bài đang chạy | Cường độ | Độ bền | Tốc độ mới | Proxy bán | Điểm nóng |",
    "|------|------------|----------|-----------------|---------------|----------|--------|------------|-----------|-----------|",
  ];
  top.forEach((row, index) => {
    lines.push(
      `| ${index + 1} | ${row.nicheName} | ${row.clusterTitle} | ${row.price.label} | ${row.activeAdCount} | ${row.scores.intensity} | ${row.scores.longevity} | ${row.scores.velocity} | ${row.scores.salesProxy} | ${row.scores.heat} |`,
    );
  });
  if (hot.length > 0) {
    lines.push(
      "",
      "## Ngành đang chạy mạnh",
      "",
      "| Ngành hàng | Nhóm | Quảng cáo | Sản phẩm mạnh | Điểm nóng cao nhất | Tỷ trọng QC |",
      "|------------|------|-----------|---------------|--------------------|-------------|",
    );
    for (const row of hot) {
      lines.push(
        `| ${row.nicheName} | ${row.group} | ${row.activeAdCount} | ${row.strongProductCount} | ${row.maxHeat} | ${row.shareOfAds}% |`,
      );
    }
  }
  lines.push(
    "",
    "## Ghi chú",
    "",
    "- Mọi cột điểm là ước lượng. Không ghi “bán chạy trên Facebook”.",
    "- Giá cạnh tên là ước lượng (user nhập / nội dung ads / khoảng ngành), không crawl sàn.",
    "- Proxy bán chỉ hiện khi user nhập số đã bán Shopee/TikTok.",
    "",
  );
  return lines.join("\n");
}
