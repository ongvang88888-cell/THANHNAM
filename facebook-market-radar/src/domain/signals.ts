import { adAgeDays, isNewInLastDays } from "./scoring";
import type { ClusterSignals } from "./ports";

export type AdForSignals = {
  isActive: boolean;
  pageId: string;
  creativeHash: string;
  startDate: string;
};

export function buildClusterSignals(
  ads: AdForSignals[],
  nowMs: number,
  salesProxySold: number | null,
): ClusterSignals {
  const active = ads.filter((ad) => ad.isActive);
  const pages = new Set(active.map((ad) => ad.pageId));
  const creatives = new Set(active.map((ad) => ad.creativeHash));
  return {
    activeAdCount: active.length,
    distinctPageCount: pages.size,
    creativeVariantCount: creatives.size,
    adsAgeDays: active.map((ad) => adAgeDays(ad.startDate, nowMs)),
    newAdsLast7Days: ads.filter((ad) => isNewInLastDays(ad.startDate, nowMs, 7)).length,
    salesProxySold,
  };
}

export function maxSold(values: Array<number | null>): number | null {
  let max: number | null = null;
  for (const value of values) {
    if (value === null) {
      continue;
    }
    if (max === null || value > max) {
      max = value;
    }
  }
  return max;
}
