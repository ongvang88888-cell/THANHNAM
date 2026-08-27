import { LOCKED_NICHES, nicheGroup, type NicheDef } from "./niches";
import type { RankingRow } from "./weekly-report";

export const STRONG_HEAT = 40;
export const STRONG_LONGEVITY = 50;

export type IndustryStat = {
  nicheSlug: string;
  nicheName: string;
  group: string;
  clusterCount: number;
  activeAdCount: number;
  pageCount: number;
  avgHeat: number;
  maxHeat: number;
  shareOfAds: number;
  shareOfPages: number;
  strongProductCount: number;
  isHot: boolean;
  hasData: boolean;
};

export type CatalogCoverage = {
  totalNiches: number;
  nichesWithData: number;
  emptyNiches: number;
  coveragePercent: number;
  searchKeywordCount: number;
  hotIndustryCount: number;
  strongProductCount: number;
};

export function isStrongProduct(row: RankingRow): boolean {
  return (
    row.scores.heat >= STRONG_HEAT ||
    (row.scores.longevity >= STRONG_LONGEVITY && row.activeAdCount >= 2)
  );
}

export function buildIndustryStats(
  rankings: RankingRow[],
  catalog: readonly NicheDef[] = LOCKED_NICHES,
): IndustryStat[] {
  const totalAds = rankings.reduce((sum, row) => sum + row.activeAdCount, 0);
  const totalPages = rankings.reduce((sum, row) => sum + row.distinctPageCount, 0);
  const byNiche = new Map<string, RankingRow[]>();
  for (const row of rankings) {
    const list = byNiche.get(row.nicheSlug) ?? [];
    list.push(row);
    byNiche.set(row.nicheSlug, list);
  }

  return catalog
    .map((niche) => {
      const rows = byNiche.get(niche.slug) ?? [];
      const activeAdCount = rows.reduce((sum, row) => sum + row.activeAdCount, 0);
      const pageCount = rows.reduce((sum, row) => sum + row.distinctPageCount, 0);
      const heats = rows.map((row) => row.scores.heat);
      const avgHeat =
        heats.length === 0 ? 0 : Math.round((heats.reduce((a, b) => a + b, 0) / heats.length) * 10) / 10;
      const maxHeat = heats.length === 0 ? 0 : Math.max(...heats);
      const strongProductCount = rows.filter(isStrongProduct).length;
      const isHot = strongProductCount >= 1 && (avgHeat >= 30 || maxHeat >= STRONG_HEAT);
      return {
        nicheSlug: niche.slug,
        nicheName: niche.nameVi,
        group: niche.group,
        clusterCount: rows.length,
        activeAdCount,
        pageCount,
        avgHeat,
        maxHeat,
        shareOfAds: totalAds === 0 ? 0 : Math.round((activeAdCount / totalAds) * 1000) / 10,
        shareOfPages: totalPages === 0 ? 0 : Math.round((pageCount / totalPages) * 1000) / 10,
        strongProductCount,
        isHot,
        hasData: rows.length > 0,
      };
    })
    .sort((a, b) => b.maxHeat - a.maxHeat || b.activeAdCount - a.activeAdCount);
}

export function catalogCoverage(
  stats: IndustryStat[],
  catalog: readonly NicheDef[] = LOCKED_NICHES,
): CatalogCoverage {
  const nichesWithData = stats.filter((s) => s.hasData).length;
  const hotIndustryCount = stats.filter((s) => s.isHot).length;
  const strongProductCount = stats.reduce((sum, s) => sum + s.strongProductCount, 0);
  const searchKeywordCount = catalog.reduce((sum, n) => sum + n.searchKeywords.length, 0);
  return {
    totalNiches: catalog.length,
    nichesWithData,
    emptyNiches: catalog.length - nichesWithData,
    coveragePercent:
      catalog.length === 0 ? 0 : Math.round((nichesWithData / catalog.length) * 1000) / 10,
    searchKeywordCount,
    hotIndustryCount,
    strongProductCount,
  };
}

export function groupIndustryStats(stats: IndustryStat[]): Array<{ group: string; rows: IndustryStat[] }> {
  const groups = new Map<string, IndustryStat[]>();
  for (const row of stats) {
    const group = row.group || nicheGroup(row.nicheSlug);
    const list = groups.get(group) ?? [];
    list.push(row);
    groups.set(group, list);
  }
  return [...groups.entries()].map(([group, rows]) => ({ group, rows }));
}
