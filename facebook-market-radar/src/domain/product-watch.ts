import { textsMatchScanQuery } from "./ad-library-scan";
import { jaccard, normalizeTitle, slugifyTitle, tokenize } from "./clustering";
import { estimateProductPrice, type PriceEstimate } from "./price";
import { snippetAround } from "./scan-phrases";

export const AD_INTENSITIES = ["chua-co", "it", "vua", "nhieu"] as const;
export type AdIntensity = (typeof AD_INTENSITIES)[number];

export type ProductWatchMatch = {
  clusterSlug: string;
  clusterTitle: string;
  nicheSlug: string;
  matchScore: number;
  matchVia: "name" | "copy" | "both";
  copySnippet: string | null;
  activeAdCount: number;
  totalAdCount: number;
  distinctPageCount: number;
  price: PriceEstimate;
};

export type ProductAdAnalysis = {
  query: string;
  slug: string;
  matches: ProductWatchMatch[];
  activeAdCount: number;
  totalAdCount: number;
  distinctPageCount: number;
  clusterCount: number;
  intensity: AdIntensity;
  intensityLabel: string;
  price: PriceEstimate | null;
};

export function nameMatchScore(query: string, title: string): number {
  const q = normalizeTitle(query);
  const t = normalizeTitle(title);
  if (q.length < 2 || t.length < 2) {
    return 0;
  }
  if (q === t) {
    return 1;
  }
  if (t.includes(q) || q.includes(t)) {
    return 0.86;
  }
  return jaccard(tokenize(q), tokenize(t));
}

export function adRunSummary(
  activeAdCount: number,
  distinctPageCount: number,
  totalAdCount?: number,
): string {
  const base = `${activeAdCount} bài đang chạy / ${distinctPageCount} trang`;
  if (totalAdCount !== undefined && totalAdCount !== activeAdCount) {
    return `${base} · ${totalAdCount} bài đã lưu`;
  }
  return base;
}

export function intensityFromCounts(activeAdCount: number, distinctPageCount: number): {
  intensity: AdIntensity;
  intensityLabel: string;
} {
  if (activeAdCount <= 0) {
    return { intensity: "chua-co", intensityLabel: "Chưa thấy bài đang chạy trong dữ liệu đã lưu" };
  }
  if (activeAdCount >= 4 || (distinctPageCount >= 2 && activeAdCount >= 3)) {
    return {
      intensity: "nhieu",
      intensityLabel: `Nhiều — ${activeAdCount} bài đang chạy / ${distinctPageCount} trang`,
    };
  }
  if (activeAdCount >= 2) {
    return {
      intensity: "vua",
      intensityLabel: `Vừa — ${activeAdCount} bài đang chạy / ${distinctPageCount} trang`,
    };
  }
  return {
    intensity: "it",
    intensityLabel: `Ít — ${activeAdCount} bài đang chạy / ${distinctPageCount} trang`,
  };
}

export function analyzeProductName(
  query: string,
  clusters: Array<{
    slug: string;
    title: string;
    nicheSlug: string;
    ads: Array<{
      isActive: boolean;
      pageId: string;
      listingPriceVnd?: number | null;
      body?: string | null;
      title?: string | null;
    }>;
  }>,
  threshold = 0.34,
): ProductAdAnalysis {
  const trimmed = query.trim();
  const specific = tokenize(trimmed).size >= 2 || normalizeTitle(trimmed).length >= 8;
  const matches: ProductWatchMatch[] = [];
  for (const cluster of clusters) {
    const nameScore = nameMatchScore(trimmed, cluster.title);
    let copyScore = 0;
    let copySnippet: string | null = null;
    for (const ad of cluster.ads) {
      for (const text of [ad.title, ad.body]) {
        if (!text) {
          continue;
        }
        if (specific && textsMatchScanQuery(trimmed, [text])) {
          copyScore = Math.max(copyScore, 0.78);
          copySnippet = copySnippet ?? snippetAround(text, trimmed);
        }
        const scored = nameMatchScore(trimmed, text);
        if (scored >= threshold) {
          copyScore = Math.max(copyScore, Math.round(scored * 90) / 100);
          copySnippet = copySnippet ?? snippetAround(text, trimmed);
        }
      }
    }
    const score = Math.max(nameScore, copyScore);
    if (score < threshold) {
      continue;
    }
    const via =
      nameScore >= threshold && copyScore >= threshold
        ? "both"
        : nameScore >= copyScore
          ? "name"
          : "copy";
    const active = cluster.ads.filter((ad) => ad.isActive);
    const pages = new Set(active.map((ad) => ad.pageId));
    matches.push({
      clusterSlug: cluster.slug,
      clusterTitle: cluster.title,
      nicheSlug: cluster.nicheSlug,
      matchScore: Math.round(score * 100) / 100,
      matchVia: via,
      copySnippet,
      activeAdCount: active.length,
      totalAdCount: cluster.ads.length,
      distinctPageCount: pages.size,
      price: estimateProductPrice({
        title: cluster.title,
        nicheSlug: cluster.nicheSlug,
        listingPricesVnd: cluster.ads.map((ad) => ad.listingPriceVnd),
        copyTexts: cluster.ads.flatMap((ad) => [ad.body, ad.title, cluster.title]),
      }),
    });
  }
  matches.sort((a, b) => b.matchScore - a.matchScore || b.activeAdCount - a.activeAdCount);
  const activeAdCount = matches.reduce((sum, row) => sum + row.activeAdCount, 0);
  const totalAdCount = matches.reduce((sum, row) => sum + row.totalAdCount, 0);
  const distinctPageCount = matches.reduce((sum, row) => sum + row.distinctPageCount, 0);
  const { intensity, intensityLabel } = intensityFromCounts(activeAdCount, distinctPageCount);
  const top = matches[0] ?? null;
  return {
    query: trimmed,
    slug: slugifyTitle(trimmed),
    matches,
    activeAdCount,
    totalAdCount,
    distinctPageCount,
    clusterCount: matches.length,
    intensity,
    intensityLabel,
    price: top?.price ?? (trimmed.length >= 2
      ? estimateProductPrice({ title: trimmed, nicheSlug: "khac" })
      : null),
  };
}
