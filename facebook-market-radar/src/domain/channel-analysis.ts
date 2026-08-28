import { officialResearchLinks, type OfficialResearchLinks } from "./sales-channels";
import {
  CHANNEL_METRIC_META,
  type ChannelMetricSource,
  isSoldMetricSource,
  parseChannelMetricSource,
} from "./sales-channels";
import { classifyLanding, type LandingKind } from "./landing";
import { clamp, round1 } from "./scoring";
import type { RankingRow } from "./weekly-report";

export type ChannelObservation = {
  clusterSlug: string;
  source: ChannelMetricSource;
  value: number;
  observedMs: number;
};

export type ChannelSoldMap = Record<"shopee" | "tiktok" | "lazada" | "tiki" | "sendo", number | null>;

export type ChannelAnalysisRow = {
  clusterSlug: string;
  clusterTitle: string;
  nicheSlug: string;
  nicheName: string;
  priceLabel: string;
  imageUrls: string[];
  fbActiveAds: number;
  fbPages: number;
  fbDaysRunning: number;
  fbHeat: number;
  fbIntensity: number;
  sold: ChannelSoldMap;
  soldTotal: number;
  googleAdsSeen: number | null;
  youtubeAdsSeen: number | null;
  tiktokAdsSeen: number | null;
  youtubeViews: number | null;
  landingKinds: LandingKind[];
  platforms: string[];
  lastSeenMs: number;
  lastObservedMs: number | null;
  observationCount: number;
  adPush: number;
  soldPush: number;
  composite: number;
  estimated: true;
  facebookNationalDump: false;
  links: OfficialResearchLinks;
};

function peakForSource(rows: readonly ChannelObservation[], source: ChannelMetricSource): number | null {
  let peak: number | null = null;
  for (const row of rows) {
    if (row.source !== source) {
      continue;
    }
    if (peak === null || row.value > peak) {
      peak = row.value;
    }
  }
  return peak;
}

function logScale(count: number, fullAt: number): number {
  if (count <= 0 || fullAt <= 1) {
    return 0;
  }
  const ratio = Math.log10(count + 1) / Math.log10(fullAt + 1);
  return clamp(ratio * 100, 0, 100);
}

export function normalizeChannelObservations(
  rows: ReadonlyArray<{ clusterSlug: string; source: string; soldCount: number; observedMs: number }>,
): ChannelObservation[] {
  const out: ChannelObservation[] = [];
  for (const row of rows) {
    const source = parseChannelMetricSource(row.source);
    if (!source || !Number.isFinite(row.soldCount) || row.soldCount < 0) {
      continue;
    }
    out.push({
      clusterSlug: row.clusterSlug,
      source,
      value: row.soldCount,
      observedMs: row.observedMs,
    });
  }
  return out;
}

export function soldTotalForCluster(rows: readonly ChannelObservation[]): number {
  let total = 0;
  for (const source of ["SHOPEE", "TIKTOK", "LAZADA", "TIKI", "SENDO"] as const) {
    const peak = peakForSource(rows, source);
    if (peak !== null) {
      total += peak;
    }
  }
  return total;
}

export function heatEligibleSold(rows: readonly ChannelObservation[]): number | null {
  const sold = rows.filter((row) => isSoldMetricSource(row.source)).map((row) => row.value);
  if (sold.length === 0) {
    return null;
  }
  return sold.reduce((max, n) => Math.max(max, n), 0);
}

export function buildChannelAnalysisRow(
  ranking: RankingRow & { daysRunning?: number },
  observations: readonly ChannelObservation[],
  landingUrls: readonly (string | null)[],
  extras: { platforms?: readonly string[]; lastSeenMs?: number } = {},
): ChannelAnalysisRow {
  const mine = observations.filter((row) => row.clusterSlug === ranking.clusterSlug);
  const sold: ChannelSoldMap = {
    shopee: peakForSource(mine, "SHOPEE"),
    tiktok: peakForSource(mine, "TIKTOK"),
    lazada: peakForSource(mine, "LAZADA"),
    tiki: peakForSource(mine, "TIKI"),
    sendo: peakForSource(mine, "SENDO"),
  };
  const soldTotal = soldTotalForCluster(mine);
  const extraAds =
    (peakForSource(mine, "GOOGLE_ADS") ?? 0) +
    (peakForSource(mine, "YOUTUBE_ADS") ?? 0) +
    (peakForSource(mine, "TIKTOK_ADS") ?? 0);
  const adPush = round1(
    clamp(0.7 * ranking.scores.intensity + 0.3 * logScale(extraAds, 30), 0, 100),
  );
  const soldPush = round1(logScale(soldTotal, 10_000));
  const composite = round1(0.55 * adPush + 0.45 * soldPush);
  const kinds = [...new Set(landingUrls.map((url) => classifyLanding(url)).filter((kind) => kind !== "none"))];
  const platforms = [
    ...new Set((extras.platforms ?? []).map((item) => item.trim().toLowerCase()).filter(Boolean)),
  ];
  const lastObservedMs = mine.reduce((max, row) => Math.max(max, row.observedMs), 0);
  return {
    clusterSlug: ranking.clusterSlug,
    clusterTitle: ranking.clusterTitle,
    nicheSlug: ranking.nicheSlug,
    nicheName: ranking.nicheName,
    priceLabel: ranking.price.label,
    imageUrls: ranking.imageUrls,
    fbActiveAds: ranking.activeAdCount,
    fbPages: ranking.distinctPageCount,
    fbDaysRunning: ranking.daysRunning ?? 0,
    fbHeat: ranking.scores.heat,
    fbIntensity: ranking.scores.intensity,
    sold,
    soldTotal,
    googleAdsSeen: peakForSource(mine, "GOOGLE_ADS"),
    youtubeAdsSeen: peakForSource(mine, "YOUTUBE_ADS"),
    tiktokAdsSeen: peakForSource(mine, "TIKTOK_ADS"),
    youtubeViews: peakForSource(mine, "YOUTUBE_VIEWS"),
    landingKinds: kinds,
    platforms,
    lastSeenMs: extras.lastSeenMs ?? 0,
    lastObservedMs: lastObservedMs > 0 ? lastObservedMs : null,
    observationCount: mine.length,
    adPush,
    soldPush,
    composite,
    estimated: true,
    facebookNationalDump: false,
    links: officialResearchLinks(ranking.clusterTitle),
  };
}

export function sortChannelAnalysis(
  rows: readonly ChannelAnalysisRow[],
  mode: "ads" | "sold" | "tong",
): ChannelAnalysisRow[] {
  const copy = [...rows];
  copy.sort((a, b) => {
    if (mode === "ads") {
      return (
        b.adPush - a.adPush ||
        b.fbActiveAds - a.fbActiveAds ||
        b.fbHeat - a.fbHeat ||
        a.clusterTitle.localeCompare(b.clusterTitle, "vi")
      );
    }
    if (mode === "sold") {
      return b.soldTotal - a.soldTotal || b.soldPush - a.soldPush || a.clusterTitle.localeCompare(b.clusterTitle, "vi");
    }
    return b.composite - a.composite || b.adPush - a.adPush || b.soldTotal - a.soldTotal;
  });
  return copy;
}

export function channelMetricLabel(source: ChannelMetricSource): string {
  return CHANNEL_METRIC_META[source].labelVi;
}
