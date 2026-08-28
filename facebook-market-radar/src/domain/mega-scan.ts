import { buildAdLibrarySearchUrl } from "./ad-library-url";
import { isUsefulScanQuery } from "./ad-library-scan";
import { normalizeTitle } from "./clustering";
import { COMMERCE_MODS, megaLexFor } from "./mega-lexicon";
import { LOCKED_NICHES, type NicheDef } from "./niches";
import { SCAN_BRANCHES } from "./scan-branches";

/** Target size the user asked for — official search URLs, not downloaded ads. */
export const MEGA_SCAN_CAP = 1_000_000;

export type MegaScanRow = {
  id: string;
  nicheSlug: string;
  nicheName: string;
  query: string;
  libraryUrl: string;
};

export type MegaScanPage = {
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
  officialSearchOnly: true;
  notAFacebookDump: true;
  page: MegaScanRow[];
};

type MegaIndex = {
  rows: MegaScanRow[];
  byNiche: Map<string, MegaScanRow[]>;
};

let cached: MegaIndex | null = null;

export function resetMegaScanCache(): void {
  cached = null;
}

function addQuery(target: Set<string>, raw: string): void {
  const query = raw.trim().replace(/\s+/g, " ");
  if (!isUsefulScanQuery(query)) {
    return;
  }
  target.add(query);
}

function stemsForNiche(niche: NicheDef): string[] {
  const lex = megaLexFor(niche.slug);
  const out = new Set<string>();
  for (const raw of [
    ...niche.searchKeywords,
    ...niche.keywords,
    ...(SCAN_BRANCHES[niche.slug] ?? []),
    ...lex.cores,
    ...lex.flavors,
  ]) {
    addQuery(out, raw);
  }
  for (const core of lex.cores) {
    for (const flavor of lex.flavors) {
      addQuery(out, `${core} ${flavor}`);
    }
  }
  return [...out];
}

function modsForNiche(niche: NicheDef): string[] {
  const lex = megaLexFor(niche.slug);
  const out = new Set<string>();
  for (const raw of [...COMMERCE_MODS, ...lex.mods]) {
    const mod = raw.trim().replace(/\s+/g, " ");
    if (mod.length < 2) {
      continue;
    }
    out.add(mod);
  }
  return [...out];
}

function queriesForNiche(niche: NicheDef): string[] {
  const stems = stemsForNiche(niche);
  const mods = modsForNiche(niche);
  const out = new Set<string>();
  for (const stem of stems) {
    addQuery(out, stem);
    const stemKey = normalizeTitle(stem);
    for (const mod of mods) {
      if (stemKey.includes(normalizeTitle(mod))) {
        continue;
      }
      addQuery(out, `${stem} ${mod}`);
    }
  }
  return [...out];
}

function toRow(niche: NicheDef, query: string): MegaScanRow {
  const key = normalizeTitle(query);
  return {
    id: `${niche.slug}:${key.replace(/\s+/g, "-")}`,
    nicheSlug: niche.slug,
    nicheName: niche.nameVi,
    query,
    libraryUrl: buildAdLibrarySearchUrl(query),
  };
}

function buildMegaIndex(catalog: readonly NicheDef[] = LOCKED_NICHES): MegaIndex {
  const seen = new Set<string>();
  const perNiche: Array<{ niche: NicheDef; rows: MegaScanRow[] }> = [];
  for (const niche of catalog) {
    const nicheRows: MegaScanRow[] = [];
    for (const query of queriesForNiche(niche)) {
      const key = normalizeTitle(query);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      nicheRows.push(toRow(niche, query));
    }
    perNiche.push({ niche, rows: nicheRows });
  }
  const slots = Math.max(catalog.length, 1);
  const base = Math.floor(MEGA_SCAN_CAP / slots);
  const rows: MegaScanRow[] = [];
  const byNiche = new Map<string, MegaScanRow[]>();
  const leftover: MegaScanRow[] = [];
  for (const block of perNiche) {
    const kept = block.rows.slice(0, base);
    byNiche.set(block.niche.slug, kept);
    rows.push(...kept);
    leftover.push(...block.rows.slice(base));
  }
  for (const row of leftover) {
    if (rows.length >= MEGA_SCAN_CAP) {
      break;
    }
    const current = byNiche.get(row.nicheSlug) ?? [];
    current.push(row);
    byNiche.set(row.nicheSlug, current);
    rows.push(row);
  }
  return { rows, byNiche };
}

export function getMegaIndex(catalog: readonly NicheDef[] = LOCKED_NICHES): MegaIndex {
  if (catalog !== LOCKED_NICHES) {
    return buildMegaIndex(catalog);
  }
  if (!cached) {
    cached = buildMegaIndex(catalog);
  }
  return cached;
}

export function megaScanCount(catalog: readonly NicheDef[] = LOCKED_NICHES): number {
  return getMegaIndex(catalog).rows.length;
}

export function megaScanCountsByNiche(
  catalog: readonly NicheDef[] = LOCKED_NICHES,
): Array<{ nicheSlug: string; nicheName: string; count: number }> {
  const index = getMegaIndex(catalog);
  return catalog.map((niche) => ({
    nicheSlug: niche.slug,
    nicheName: niche.nameVi,
    count: index.byNiche.get(niche.slug)?.length ?? 0,
  }));
}

export function pageMegaScan(input: {
  offset?: number;
  limit?: number;
  nicheSlug?: string;
  q?: string;
  catalog?: readonly NicheDef[];
}): MegaScanPage {
  const index = getMegaIndex(input.catalog);
  const needle = input.q?.trim() ? normalizeTitle(input.q) : "";
  let pool = input.nicheSlug ? (index.byNiche.get(input.nicheSlug) ?? []) : index.rows;
  if (needle) {
    pool = pool.filter((row) => normalizeTitle(row.query).includes(needle));
  }
  const limit = Math.min(Math.max(input.limit ?? 40, 10), 80);
  const offset = Math.max(Math.trunc(input.offset ?? 0), 0);
  const page = pool.slice(offset, offset + limit);
  return {
    total: pool.length,
    offset,
    limit,
    hasMore: offset + page.length < pool.length,
    officialSearchOnly: true,
    notAFacebookDump: true,
    page,
  };
}
