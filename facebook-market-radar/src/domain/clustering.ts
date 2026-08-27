import { isLockedNiche, LOCKED_NICHES } from "./niches";

export type ClusterDraft = {
  slug: string;
  title: string;
  nicheSlug: string;
};

export function normalizeTitle(title: string): string {
  return title
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function slugifyTitle(title: string): string {
  const normalized = normalizeTitle(title)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return normalized.slice(0, 80) || "san-pham";
}

export function tokenize(title: string): Set<string> {
  return new Set(normalizeTitle(title).split(" ").filter((token) => token.length >= 2));
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) {
    return 0;
  }
  let inter = 0;
  for (const token of a) {
    if (b.has(token)) {
      inter += 1;
    }
  }
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

export function guessNiche(title: string, hint: string | null): string {
  if (hint && isLockedNiche(hint)) {
    return hint;
  }
  const hay = normalizeTitle(title);
  let best = "khac";
  let bestHits = 0;
  for (const niche of LOCKED_NICHES) {
    if (niche.slug === "khac" || niche.keywords.length === 0) {
      continue;
    }
    const hits = niche.keywords.filter((kw) => hay.includes(kw)).length;
    if (hits > bestHits) {
      bestHits = hits;
      best = niche.slug;
    }
  }
  return best;
}

export function draftCluster(productTitle: string, nicheHint: string | null): ClusterDraft {
  const title = productTitle.trim();
  return {
    slug: slugifyTitle(title),
    title,
    nicheSlug: guessNiche(title, nicheHint),
  };
}

export function shouldMergeClusters(titleA: string, titleB: string, threshold = 0.5): boolean {
  return jaccard(tokenize(titleA), tokenize(titleB)) >= threshold;
}
