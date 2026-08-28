import type { ChannelAnalysisRow } from "@/domain/channel-analysis";
import { hasInstagramPlacement, type PlatformTabId } from "@/domain/platform-dashboards";

export function formatMetric(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "—";
  }
  return value.toLocaleString("vi-VN");
}

export function primaryMetricLabel(tab: PlatformTabId, row: ChannelAnalysisRow): string {
  switch (tab) {
    case "facebook":
      return `${row.fbActiveAds} ads / ${row.fbPages} trang`;
    case "instagram":
      return hasInstagramPlacement(row) ? `${row.fbActiveAds} ads (có IG)` : "không có placement IG";
    case "google":
      return formatMetric(row.googleAdsSeen);
    case "youtube":
      return `ads ${formatMetric(row.youtubeAdsSeen)} · xem ${formatMetric(row.youtubeViews)}`;
    case "tiktok":
      return `bán ${formatMetric(row.sold.tiktok)} · ads ${formatMetric(row.tiktokAdsSeen)}`;
    case "shopee":
      return formatMetric(row.sold.shopee);
    case "lazada":
      return formatMetric(row.sold.lazada);
    case "tiki":
      return formatMetric(row.sold.tiki);
    case "sendo":
      return formatMetric(row.sold.sendo);
  }
}
