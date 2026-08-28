import { buildAdLibraryAdUrl, buildAdLibraryPageUrl } from "./ad-library-url";
import { detectCreativeAngles, hookLine, type CreativeAngle } from "./creative-angles";
import { classifyLanding, safeLandingHref, type LandingKind } from "./landing";
import { productImagePath, uniqueImageUrls } from "./product-image";
import type { ResearchRow, SavedAdLite, TrendLane } from "./saved-research";
import { adAgeDays } from "./scoring";

export type LibrarySort = "heat" | "days" | "latest" | "lastSeen";

export type LibraryCardCluster = {
  slug: string;
  title: string;
  nicheSlug: string;
  imageUrl: string | null;
};

export type LibraryCardPage = {
  pageId: string;
  pageName: string;
};

export type LibraryAdCard = {
  libraryId: string;
  pageId: string;
  pageName: string;
  clusterSlug: string;
  clusterTitle: string;
  nicheName: string;
  imageUrl: string | null;
  hook: string;
  copy: string;
  landingKind: LandingKind;
  landingUrl: string | null;
  startDate: string;
  firstSeenMs: number;
  lastSeenMs: number;
  isActive: boolean;
  daysRunning: number;
  heat: number;
  intensity: number;
  longevity: number;
  velocity: number;
  lane: TrendLane;
  priceLabel: string;
  libraryAdUrl: string;
  libraryPageUrl: string;
  angles: CreativeAngle[];
};

export function parseLibrarySort(raw?: string): LibrarySort {
  if (raw === "days" || raw === "latest" || raw === "lastSeen") {
    return raw;
  }
  return "heat";
}

export function buildLibraryCards(
  ads: readonly SavedAdLite[],
  clusters: readonly LibraryCardCluster[],
  pages: readonly LibraryCardPage[],
  research: readonly ResearchRow[],
  nowMs: number,
): LibraryAdCard[] {
  const clusterBySlug = new Map(clusters.map((cluster) => [cluster.slug, cluster]));
  const pageById = new Map(pages.map((page) => [page.pageId, page]));
  const researchBySlug = new Map(research.map((row) => [row.clusterSlug, row]));
  const out: LibraryAdCard[] = [];
  for (const ad of ads) {
    const row = researchBySlug.get(ad.clusterSlug);
    if (!row) {
      continue;
    }
    const cluster = clusterBySlug.get(ad.clusterSlug);
    const page = pageById.get(ad.pageId);
    const images = uniqueImageUrls([
      ad.imageUrl,
      cluster?.imageUrl,
      cluster
        ? productImagePath(cluster.slug, cluster.title, cluster.nicheSlug)
        : productImagePath(ad.clusterSlug, ad.clusterSlug, "khac"),
    ]);
    out.push({
      libraryId: ad.libraryId,
      pageId: ad.pageId,
      pageName: page?.pageName || ad.pageId,
      clusterSlug: ad.clusterSlug,
      clusterTitle: cluster?.title ?? row.clusterTitle,
      nicheName: row.nicheName,
      imageUrl: images[0] ?? null,
      hook: hookLine([ad.title, ad.body, row.clusterTitle]),
      copy: [ad.title, ad.body].filter(Boolean).join(" — ").slice(0, 180),
      landingKind: classifyLanding(ad.landingUrl),
      landingUrl: safeLandingHref(ad.landingUrl),
      startDate: ad.startDate,
      firstSeenMs: ad.firstSeenMs,
      lastSeenMs: ad.lastSeenMs,
      isActive: ad.isActive,
      daysRunning: adAgeDays(ad.startDate, nowMs),
      heat: row.scores.heat,
      intensity: row.scores.intensity,
      longevity: row.scores.longevity,
      velocity: row.scores.velocity,
      lane: row.lane,
      priceLabel: row.price.label,
      libraryAdUrl: buildAdLibraryAdUrl(ad.libraryId),
      libraryPageUrl: buildAdLibraryPageUrl(ad.pageId),
      angles: detectCreativeAngles([ad.title, ad.body, row.clusterTitle]),
    });
  }
  return out;
}

export function sortLibraryCards(cards: readonly LibraryAdCard[], sort: LibrarySort): LibraryAdCard[] {
  return [...cards].sort((left, right) => {
    if (sort === "days") {
      return right.daysRunning - left.daysRunning;
    }
    if (sort === "latest") {
      return right.firstSeenMs - left.firstSeenMs;
    }
    if (sort === "lastSeen") {
      return right.lastSeenMs - left.lastSeenMs;
    }
    return right.heat - left.heat;
  });
}
