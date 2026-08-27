import { isoWeekLabel } from "./week";
import type { ScoreBreakdown } from "./ports";

export type RankingRow = {
  clusterSlug: string;
  clusterTitle: string;
  nicheSlug: string;
  nicheName: string;
  activeAdCount: number;
  distinctPageCount: number;
  scores: ScoreBreakdown;
};

export type WeeklyReportInput = {
  nowMs: number;
  weekLabel?: string;
  adCount: number;
  pageCount: number;
  clusterCount: number;
  rankings: RankingRow[];
};

export function buildWeeklyReportMarkdown(input: WeeklyReportInput): string {
  const week = input.weekLabel ?? isoWeekLabel(input.nowMs);
  const top = [...input.rankings].sort((a, b) => b.scores.heat - a.scores.heat).slice(0, 20);
  const lines = [
    `# Báo cáo tuần Facebook Market Radar — ${week}`,
    "",
    "**Phạm vi:** Ad Library do user lưu + proxy ngoài Facebook.",
    "**Không phải:** doanh số / ROAS / CPA Facebook của đối thủ.",
    "",
    "## Tóm tắt",
    "",
    `- Số ads ghi nhận: ${input.adCount}`,
    `- Số page: ${input.pageCount}`,
    `- Số cụm sản phẩm: ${input.clusterCount}`,
    "",
    "## Top cụm theo HeatScore (ước lượng)",
    "",
    "| Hạng | Ngách | Cụm | Intensity | Longevity | Velocity | Sales proxy | Heat |",
    "|------|-------|-----|-----------|-----------|----------|-------------|------|",
  ];
  top.forEach((row, index) => {
    lines.push(
      `| ${index + 1} | ${row.nicheName} | ${row.clusterTitle} | ${row.scores.intensity} | ${row.scores.longevity} | ${row.scores.velocity} | ${row.scores.salesProxy} | ${row.scores.heat} |`,
    );
  });
  lines.push(
    "",
    "## Ghi chú",
    "",
    "- Mọi cột điểm là ước lượng. Không ghi “bán chạy trên Facebook”.",
    "- Sales proxy chỉ hiện khi user nhập Shopee/TikTok sold.",
    "",
  );
  return lines.join("\n");
}
