import { buildAdLibrarySearchUrl } from "./ad-library-url";
import { normalizeTitle, slugifyTitle, tokenize } from "./clustering";
import { buildIndustryStats, type IndustryStat } from "./industry-stats";
import { LOCKED_NICHES, nicheGroup, type NicheDef } from "./niches";
import { SCAN_BRANCHES } from "./scan-branches";
import type { RankingRow } from "./weekly-report";

export type ScanBranchKind = "catalog" | "running";

export type ScanBranch = {
  id: string;
  kind: ScanBranchKind;
  nicheSlug: string;
  nicheName: string;
  group: string;
  query: string;
  libraryUrl: string;
  covered: boolean;
  matchedProductCount: number;
  nicheHasData: boolean;
  priority: number;
};

export type ScanPlan = {
  branches: ScanBranch[];
  runningProducts: ScanBranch[];
  totalBranches: number;
  uncoveredCount: number;
  coveredCount: number;
  emptyNicheCount: number;
  nextBatch: ScanBranch[];
};

export function scanQueriesForNiche(niche: NicheDef): string[] {
  const extras = SCAN_BRANCHES[niche.slug] ?? [];
  const merged = [...niche.searchKeywords, ...niche.keywords, ...extras];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of merged) {
    const query = raw.trim().replace(/\s+/g, " ");
    if (!isUsefulScanQuery(query)) {
      continue;
    }
    const key = normalizeTitle(query);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(query);
  }
  return out;
}

export function catalogScanQueryCount(catalog: readonly NicheDef[] = LOCKED_NICHES): number {
  return catalog.reduce((sum, niche) => sum + scanQueriesForNiche(niche).length, 0);
}

export function isUsefulScanQuery(query: string): boolean {
  const trimmed = query.trim();
  if (trimmed.length < 4) {
    return false;
  }
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  return tokens.length >= 2;
}

export function textsMatchScanQuery(query: string, texts: readonly string[]): boolean {
  const needle = normalizeTitle(query);
  if (!needle) {
    return false;
  }
  const queryTokens = tokenize(query);
  for (const text of texts) {
    const hay = normalizeTitle(text);
    if (!hay) {
      continue;
    }
    if (hay.includes(needle)) {
      return true;
    }
    if (queryTokens.size >= 2) {
      const hayTokens = tokenize(text);
      let hit = 0;
      for (const token of queryTokens) {
        if (hayTokens.has(token)) {
          hit += 1;
        }
      }
      if (hit === queryTokens.size) {
        return true;
      }
    }
  }
  return false;
}

export function buildScanPlan(
  rankings: RankingRow[],
  extraTexts: readonly string[] = [],
  catalog: readonly NicheDef[] = LOCKED_NICHES,
  nextBatchSize = 20,
): ScanPlan {
  const industries = buildIndustryStats(rankings, catalog);
  const byNiche = new Map<string, IndustryStat>(industries.map((row) => [row.nicheSlug, row]));
  const textsByNiche = new Map<string, string[]>();
  for (const row of rankings) {
    const list = textsByNiche.get(row.nicheSlug) ?? [];
    list.push(row.clusterTitle);
    textsByNiche.set(row.nicheSlug, list);
  }

  const branches: ScanBranch[] = [];
  for (const niche of catalog) {
    const stat = byNiche.get(niche.slug);
    const nicheHasData = Boolean(stat?.hasData);
    const nicheTexts = [...(textsByNiche.get(niche.slug) ?? []), ...extraTexts];
    for (const query of scanQueriesForNiche(niche)) {
      const matched = textsByNiche.get(niche.slug)?.filter((title) => textsMatchScanQuery(query, [title])) ?? [];
      const covered = textsMatchScanQuery(query, nicheTexts);
      const priority = scanPriority(nicheHasData, covered);
      branches.push({
        id: `${niche.slug}:${slugifyTitle(query)}`,
        kind: "catalog",
        nicheSlug: niche.slug,
        nicheName: niche.nameVi,
        group: niche.group,
        query,
        libraryUrl: buildAdLibrarySearchUrl(query),
        covered,
        matchedProductCount: matched.length,
        nicheHasData,
        priority,
      });
    }
  }

  branches.sort(compareScanBranches);

  const uncoveredCount = branches.filter((row) => !row.covered).length;
  return {
    branches,
    runningProducts: runningProductBranches(rankings),
    totalBranches: branches.length,
    uncoveredCount,
    coveredCount: branches.length - uncoveredCount,
    emptyNicheCount: industries.filter((row) => !row.hasData).length,
    nextBatch: branches.filter((row) => !row.covered).slice(0, nextBatchSize),
  };
}

/** Saved products that already have running ads — reopen Ad Library to find more cards. */
export function runningProductBranches(rankings: RankingRow[]): ScanBranch[] {
  const out: ScanBranch[] = [];
  const seen = new Set<string>();
  for (const row of rankings) {
    if (row.activeAdCount <= 0) {
      continue;
    }
    const query = row.clusterTitle.trim();
    if (!isUsefulScanQuery(query)) {
      continue;
    }
    const id = `running:${row.clusterSlug}`;
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    out.push({
      id,
      kind: "running",
      nicheSlug: row.nicheSlug,
      nicheName: row.nicheName,
      group: nicheGroup(row.nicheSlug),
      query,
      libraryUrl: buildAdLibrarySearchUrl(query),
      covered: true,
      matchedProductCount: 1,
      nicheHasData: true,
      priority: 50 + Math.min(Math.max(row.scores.heat, 0), 100),
    });
  }
  return out.sort(compareScanBranches);
}

export function compareScanBranches(a: ScanBranch, b: ScanBranch): number {
  return (
    b.priority - a.priority ||
    Number(a.nicheHasData) - Number(b.nicheHasData) ||
    a.group.localeCompare(b.group, "vi") ||
    a.query.localeCompare(b.query, "vi")
  );
}

function scanPriority(nicheHasData: boolean, covered: boolean): number {
  if (!nicheHasData && !covered) {
    return 300;
  }
  if (!nicheHasData) {
    return 200;
  }
  if (!covered) {
    return 100;
  }
  return 10;
}
