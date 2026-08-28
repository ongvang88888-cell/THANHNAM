export const ALERT_TYPES = ["NEW_PAGE", "NEW_CREATIVE", "SURGE", "WATCHED_PAGE_NEW_AD"] as const;
export type AlertType = (typeof ALERT_TYPES)[number];

export const ALERT_TYPE_VI: Record<AlertType, string> = {
  NEW_PAGE: "Trang mới",
  NEW_CREATIVE: "Nội dung mới",
  SURGE: "Tăng tốc quảng cáo",
  WATCHED_PAGE_NEW_AD: "Trang đang theo — thẻ mới",
};

export type AlertDraft = {
  type: AlertType;
  title: string;
  detail: string;
  pageId: string | null;
  clusterSlug: string | null;
};

export type AlertScanInput = {
  pageId: string;
  pageName: string;
  pageFirstSeenMs: number;
  creativeHash: string;
  creativeFirstSeenMs: number;
  clusterSlug: string;
  newAdsLast7Days: number;
  previousWeekNewAds: number;
  nowMs: number;
};

const WEEK_MS = 7 * 86_400_000;

export function detectAlerts(input: AlertScanInput): AlertDraft[] {
  const alerts: AlertDraft[] = [];
  if (input.nowMs - input.pageFirstSeenMs <= WEEK_MS) {
    alerts.push({
      type: "NEW_PAGE",
      title: `Page mới: ${input.pageName}`,
      detail: `Lần đầu thấy page ${input.pageId} trong ngách ${input.clusterSlug}.`,
      pageId: input.pageId,
      clusterSlug: input.clusterSlug,
    });
  }
  if (input.nowMs - input.creativeFirstSeenMs <= WEEK_MS) {
    alerts.push({
      type: "NEW_CREATIVE",
      title: `Creative mới trên ${input.pageName}`,
      detail: `Hash ${input.creativeHash.slice(0, 12)} vừa xuất hiện.`,
      pageId: input.pageId,
      clusterSlug: input.clusterSlug,
    });
  }
  if (input.newAdsLast7Days >= 3 && input.newAdsLast7Days >= input.previousWeekNewAds * 2) {
    alerts.push({
      type: "SURGE",
      title: `Tăng tốc ads: ${input.clusterSlug}`,
      detail: `${input.newAdsLast7Days} ads mới / 7 ngày (tuần trước ${input.previousWeekNewAds}).`,
      pageId: input.pageId,
      clusterSlug: input.clusterSlug,
    });
  }
  return alerts;
}

export function creativeHash(parts: {
  libraryId: string;
  body: string | null;
  title: string | null;
}): string {
  const raw = `${parts.libraryId}|${parts.title ?? ""}|${parts.body ?? ""}`;
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i += 1) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a_${(hash >>> 0).toString(16)}`;
}
