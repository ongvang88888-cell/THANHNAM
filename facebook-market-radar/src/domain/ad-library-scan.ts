import { buildAdLibrarySearchUrl } from "./ad-library-url";
import { normalizeTitle, slugifyTitle, tokenize } from "./clustering";
import { buildIndustryStats, type IndustryStat } from "./industry-stats";
import { LOCKED_NICHES, nicheGroup, nicheName, type NicheDef } from "./niches";
import type { ProductAdAnalysis } from "./product-watch";
import { SCAN_BRANCHES } from "./scan-branches";
import { extractCopyPhrases, nameVariantQueries } from "./scan-phrases";
import type { RankingRow } from "./weekly-report";

export type ScanBranchKind = "catalog" | "running" | "copy" | "name-variant";

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

export type ScanAdInput = {
  nicheSlug: string;
  title: string | null;
  body: string | null;
  isActive: boolean;
};

export type ScanPlan = {
  branches: ScanBranch[];
  runningProducts: ScanBranch[];
  nameVariants: ScanBranch[];
  copyKeywords: ScanBranch[];
  moreRunningBatch: ScanBranch[];
  totalBranches: number;
  uncoveredCount: number;
  coveredCount: number;
  emptyNicheCount: number;
  nextBatch: ScanBranch[];
};

export type ScanLookup = {
  query: string;
  libraryUrl: string;
  variants: ScanBranch[];
  analysis: ProductAdAnalysis;
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
  ads: readonly ScanAdInput[] = [],
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
  const catalogKeys = new Set(branches.map((row) => normalizeTitle(row.query)));
  const runningProducts = runningProductBranches(rankings);
  const nameVariants = nameVariantBranches(rankings, catalogKeys);
  const copyKeywords = copyKeywordBranches(ads, catalogKeys);
  const moreRunningBatch = interleaveScanKinds(
    [nameVariants, copyKeywords, runningProducts],
    nextBatchSize,
  );
  return {
    branches,
    runningProducts,
    nameVariants,
    copyKeywords,
    moreRunningBatch,
    totalBranches: branches.length,
    uncoveredCount,
    coveredCount: branches.length - uncoveredCount,
    emptyNicheCount: industries.filter((row) => !row.hasData).length,
    nextBatch: branches.filter((row) => !row.covered).slice(0, nextBatchSize),
  };
}

export function buildScanLookup(query: string, analysis: ProductAdAnalysis): ScanLookup {
  const trimmed = query.trim();
  const nicheSlug = analysis.matches[0]?.nicheSlug ?? "khac";
  const variants = nameVariantQueries(trimmed).map((phrase, index) =>
    makeBranch({
      id: `lookup:${slugifyTitle(phrase)}`,
      kind: "name-variant",
      nicheSlug,
      query: phrase,
      covered: textsMatchScanQuery(phrase, [
        analysis.query,
        ...analysis.matches.map((row) => row.clusterTitle),
      ]),
      matchedProductCount: analysis.matches.filter((row) => textsMatchScanQuery(phrase, [row.clusterTitle])).length,
      nicheHasData: analysis.matches.length > 0,
      priority: 180 - index * 5,
    }),
  );
  return {
    query: trimmed,
    libraryUrl: buildAdLibrarySearchUrl(trimmed),
    variants,
    analysis,
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

export function nameVariantBranches(
  rankings: RankingRow[],
  catalogKeys: ReadonlySet<string> = new Set(),
): ScanBranch[] {
  const out: ScanBranch[] = [];
  const seen = new Set<string>();
  for (const row of rankings) {
    if (row.activeAdCount <= 0) {
      continue;
    }
    const full = normalizeTitle(row.clusterTitle);
    for (const phrase of nameVariantQueries(row.clusterTitle)) {
      const key = normalizeTitle(phrase);
      if (key === full || catalogKeys.has(key) || seen.has(key)) {
        continue;
      }
      seen.add(key);
      out.push(
        makeBranch({
          id: `name-variant:${row.clusterSlug}:${slugifyTitle(phrase)}`,
          kind: "name-variant",
          nicheSlug: row.nicheSlug,
          query: phrase,
          covered: true,
          matchedProductCount: 1,
          nicheHasData: true,
          priority: 40 + Math.min(Math.max(row.scores.heat, 0), 80),
        }),
      );
    }
  }
  return out.sort(compareScanBranches);
}

export function copyKeywordBranches(
  ads: readonly ScanAdInput[],
  catalogKeys: ReadonlySet<string> = new Set(),
): ScanBranch[] {
  const counts = new Map<string, { query: string; nicheSlug: string; active: number }>();
  for (const ad of ads) {
    if (!ad.isActive) {
      continue;
    }
    const phrases = [
      ...extractCopyPhrases(ad.body ?? ""),
      ...extractCopyPhrases(ad.title ?? ""),
    ];
    for (const phrase of phrases) {
      const key = normalizeTitle(phrase);
      if (catalogKeys.has(key)) {
        continue;
      }
      const current = counts.get(key);
      if (current) {
        current.active += 1;
        continue;
      }
      counts.set(key, { query: phrase, nicheSlug: ad.nicheSlug, active: 1 });
    }
  }
  return [...counts.values()]
    .map((row) =>
      makeBranch({
        id: `copy:${row.nicheSlug}:${slugifyTitle(row.query)}`,
        kind: "copy",
        nicheSlug: row.nicheSlug,
        query: row.query,
        covered: true,
        matchedProductCount: row.active,
        nicheHasData: true,
        priority: 120 + Math.min(row.active * 8, 40),
      }),
    )
    .sort(compareScanBranches)
    .slice(0, 80);
}

export function scanBranchKindLabel(kind: ScanBranchKind): string {
  if (kind === "running") {
    return "Tên sản phẩm đang chạy";
  }
  if (kind === "copy") {
    return "Từ khóa trong bài ads";
  }
  if (kind === "name-variant") {
    return "Biến thể tên";
  }
  return "Cành catalog";
}

function makeBranch(input: {
  id: string;
  kind: ScanBranchKind;
  nicheSlug: string;
  query: string;
  covered: boolean;
  matchedProductCount: number;
  nicheHasData: boolean;
  priority: number;
}): ScanBranch {
  return {
    id: input.id,
    kind: input.kind,
    nicheSlug: input.nicheSlug,
    nicheName: nicheName(input.nicheSlug),
    group: nicheGroup(input.nicheSlug),
    query: input.query,
    libraryUrl: buildAdLibrarySearchUrl(input.query),
    covered: input.covered,
    matchedProductCount: input.matchedProductCount,
    nicheHasData: input.nicheHasData,
    priority: input.priority,
  };
}

function interleaveScanKinds(groups: ScanBranch[][], max: number): ScanBranch[] {
  const seen = new Set<string>();
  const indexes = groups.map(() => 0);
  const out: ScanBranch[] = [];
  let progressed = true;
  while (out.length < max && progressed) {
    progressed = false;
    for (let g = 0; g < groups.length; g += 1) {
      const group = groups[g] ?? [];
      while ((indexes[g] ?? 0) < group.length) {
        const row = group[indexes[g] ?? 0];
        indexes[g] = (indexes[g] ?? 0) + 1;
        if (!row) {
          continue;
        }
        const key = normalizeTitle(row.query);
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        out.push(row);
        progressed = true;
        break;
      }
      if (out.length >= max) {
        break;
      }
    }
  }
  return out;
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
