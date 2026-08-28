import type { ChannelAnalysisRow, ChannelSoldMap } from "./channel-analysis";
import type { OfficialResearchLinks } from "./sales-channels";

/** Snapshot + official API fill interval for the homepage table. */
export const SUMMARY_INTERVAL_MS = 6 * 60 * 60 * 1000;
export const SUMMARY_CYCLE_KEEP = 12;
/** Sold (5) + ads-seen (3) + YouTube views (1). Facebook ads/pages are always present. */
export const SUMMARY_OPTIONAL_CELL_COUNT = 9;

export type SummarySoldMap = ChannelSoldMap;

export type SummaryRowSnapshot = {
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
  sold: SummarySoldMap;
  soldTotal: number;
  googleAdsSeen: number | null;
  youtubeAdsSeen: number | null;
  tiktokAdsSeen: number | null;
  youtubeViews: number | null;
  landingKinds: string[];
  adPush: number;
  soldPush: number;
  composite: number;
  links: OfficialResearchLinks;
};

export type SummarySnapshot = {
  capturedAt: string;
  nextDueAt: string;
  rowCount: number;
  filledCells: number;
  emptyCells: number;
  apiRan: boolean;
  estimated: true;
  facebookNationalDump: false;
  nationalSalesDump: false;
  marketSoldFromApi: false;
  scrapeMarketplaceHtml: false;
  rows: SummaryRowSnapshot[];
};

export type OptionalMetricRow = {
  sold: ChannelSoldMap;
  googleAdsSeen: number | null;
  youtubeAdsSeen: number | null;
  tiktokAdsSeen: number | null;
  youtubeViews: number | null;
};

export function nextSummaryDueAt(capturedAtMs: number): number {
  return capturedAtMs + SUMMARY_INTERVAL_MS;
}

export function isSummaryDue(nextDueAtMs: number | null | undefined, nowMs: number): boolean {
  if (nextDueAtMs === null || nextDueAtMs === undefined) {
    return true;
  }
  return nowMs >= nextDueAtMs;
}

export function optionalMetricValues(row: OptionalMetricRow): Array<number | null> {
  return [
    row.sold.shopee,
    row.sold.tiktok,
    row.sold.lazada,
    row.sold.tiki,
    row.sold.sendo,
    row.googleAdsSeen,
    row.youtubeAdsSeen,
    row.tiktokAdsSeen,
    row.youtubeViews,
  ];
}

export function countOptionalMetricCells(rows: readonly OptionalMetricRow[]): {
  filledCells: number;
  emptyCells: number;
} {
  let filledCells = 0;
  let emptyCells = 0;
  for (const row of rows) {
    for (const cell of optionalMetricValues(row)) {
      if (cell === null || cell === undefined) {
        emptyCells += 1;
      } else {
        filledCells += 1;
      }
    }
  }
  return { filledCells, emptyCells };
}

/** Live warehouse wins. Snapshot may fill a null. Never invent a number. */
export function mergeOptionalMetric(live: number | null, snapshot: number | null): number | null {
  if (live !== null && live !== undefined) {
    return live;
  }
  if (snapshot !== null && snapshot !== undefined) {
    return snapshot;
  }
  return null;
}

export function filterSummaryRows<T extends { clusterTitle: string; nicheName: string }>(
  rows: readonly T[],
  query: string,
): T[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) {
    return [...rows];
  }
  return rows.filter(
    (row) =>
      row.clusterTitle.toLowerCase().includes(q) || row.nicheName.toLowerCase().includes(q),
  );
}

export function toSummaryRowSnapshot(row: ChannelAnalysisRow): SummaryRowSnapshot {
  return {
    clusterSlug: row.clusterSlug,
    clusterTitle: row.clusterTitle,
    nicheSlug: row.nicheSlug,
    nicheName: row.nicheName,
    priceLabel: row.priceLabel,
    imageUrls: [...row.imageUrls],
    fbActiveAds: row.fbActiveAds,
    fbPages: row.fbPages,
    fbDaysRunning: row.fbDaysRunning,
    fbHeat: row.fbHeat,
    sold: { ...row.sold },
    soldTotal: row.soldTotal,
    googleAdsSeen: row.googleAdsSeen,
    youtubeAdsSeen: row.youtubeAdsSeen,
    tiktokAdsSeen: row.tiktokAdsSeen,
    youtubeViews: row.youtubeViews,
    landingKinds: [...row.landingKinds],
    adPush: row.adPush,
    soldPush: row.soldPush,
    composite: row.composite,
    links: { ...row.links },
  };
}

export function buildSummarySnapshot(input: {
  capturedAtMs: number;
  rows: readonly ChannelAnalysisRow[];
  apiRan: boolean;
}): SummarySnapshot {
  const cells = countOptionalMetricCells(input.rows);
  return {
    capturedAt: new Date(input.capturedAtMs).toISOString(),
    nextDueAt: new Date(nextSummaryDueAt(input.capturedAtMs)).toISOString(),
    rowCount: input.rows.length,
    filledCells: cells.filledCells,
    emptyCells: cells.emptyCells,
    apiRan: input.apiRan,
    estimated: true,
    facebookNationalDump: false,
    nationalSalesDump: false,
    marketSoldFromApi: false,
    scrapeMarketplaceHtml: false,
    rows: input.rows.map(toSummaryRowSnapshot),
  };
}

function asFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asOptionalCount(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return value;
  }
  return null;
}

function parseSold(raw: unknown): ChannelSoldMap {
  const obj = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  return {
    shopee: asOptionalCount(obj.shopee),
    tiktok: asOptionalCount(obj.tiktok),
    lazada: asOptionalCount(obj.lazada),
    tiki: asOptionalCount(obj.tiki),
    sendo: asOptionalCount(obj.sendo),
  };
}

const LINK_KEYS = [
  "metaAdLibrary",
  "googleAds",
  "youtube",
  "tiktokTopAds",
  "tiktokSearch",
  "shopee",
  "lazada",
  "tiki",
  "sendo",
  "trends",
  "shopping",
] as const;

function parseLinks(raw: unknown): OfficialResearchLinks | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const obj = raw as Record<string, unknown>;
  const out: Partial<OfficialResearchLinks> = {};
  for (const key of LINK_KEYS) {
    const value = obj[key];
    if (typeof value !== "string" || !value) {
      return null;
    }
    out[key] = value;
  }
  return out as OfficialResearchLinks;
}

export function parseSummarySnapshot(payload: unknown): SummarySnapshot | null {
  let parsed: unknown = payload;
  if (typeof payload === "string") {
    try {
      parsed = JSON.parse(payload) as unknown;
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }
  const raw = parsed as Record<string, unknown>;
  if (!Array.isArray(raw.rows)) {
    return null;
  }
  const capturedAt = typeof raw.capturedAt === "string" ? raw.capturedAt : null;
  const nextDueAt = typeof raw.nextDueAt === "string" ? raw.nextDueAt : null;
  if (!capturedAt || !nextDueAt) {
    return null;
  }
  const rows: SummaryRowSnapshot[] = [];
  for (const item of raw.rows) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }
    const row = item as Record<string, unknown>;
    if (typeof row.clusterSlug !== "string" || typeof row.clusterTitle !== "string") {
      continue;
    }
    const links = parseLinks(row.links);
    if (!links) {
      continue;
    }
    const sold = parseSold(row.sold);
    rows.push({
      clusterSlug: row.clusterSlug,
      clusterTitle: row.clusterTitle,
      nicheSlug: typeof row.nicheSlug === "string" ? row.nicheSlug : "",
      nicheName: typeof row.nicheName === "string" ? row.nicheName : "",
      priceLabel: typeof row.priceLabel === "string" ? row.priceLabel : "",
      imageUrls: Array.isArray(row.imageUrls)
        ? row.imageUrls.filter((url): url is string => typeof url === "string")
        : [],
      fbActiveAds: asOptionalCount(row.fbActiveAds) ?? 0,
      fbPages: asOptionalCount(row.fbPages) ?? 0,
      fbDaysRunning: asOptionalCount(row.fbDaysRunning) ?? 0,
      fbHeat: asFiniteNumber(row.fbHeat) ?? 0,
      sold,
      soldTotal: asOptionalCount(row.soldTotal) ?? 0,
      googleAdsSeen: asOptionalCount(row.googleAdsSeen),
      youtubeAdsSeen: asOptionalCount(row.youtubeAdsSeen),
      tiktokAdsSeen: asOptionalCount(row.tiktokAdsSeen),
      youtubeViews: asOptionalCount(row.youtubeViews),
      landingKinds: Array.isArray(row.landingKinds)
        ? row.landingKinds.filter((kind): kind is string => typeof kind === "string")
        : [],
      adPush: asFiniteNumber(row.adPush) ?? 0,
      soldPush: asFiniteNumber(row.soldPush) ?? 0,
      composite: asFiniteNumber(row.composite) ?? 0,
      links,
    });
  }
  const cells = countOptionalMetricCells(rows);
  return {
    capturedAt,
    nextDueAt,
    rowCount: typeof raw.rowCount === "number" ? raw.rowCount : rows.length,
    filledCells: typeof raw.filledCells === "number" ? raw.filledCells : cells.filledCells,
    emptyCells: typeof raw.emptyCells === "number" ? raw.emptyCells : cells.emptyCells,
    apiRan: raw.apiRan === true,
    estimated: true,
    facebookNationalDump: false,
    nationalSalesDump: false,
    marketSoldFromApi: false,
    scrapeMarketplaceHtml: false,
    rows,
  };
}
