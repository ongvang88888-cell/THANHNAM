export type ClusterDraft = {
  slug: string;
  title: string;
  nicheSlug: string;
};

const NICHE_KEYWORDS: ReadonlyArray<{ slug: string; keywords: readonly string[] }> = [
  {
    slug: "my-pham",
    keywords: ["serum", "niacinamide", "retinol", "kem chống nắng", "dầu gội", "skincare", "dưỡng"],
  },
  {
    slug: "me-be",
    keywords: ["bỉm", "sữa công thức", "hút sữa", "ăn dặm", "xe đẩy", "em bé", "mẹ"],
  },
  {
    slug: "gadget",
    keywords: ["đèn", "led", "kệ", "tai nghe", "ổ cắm", "hút bụi", "wifi"],
  },
  {
    slug: "tpcn",
    keywords: ["collagen", "vitamin", "omega", "glutathione", "viên uống", "giảm cân"],
  },
  {
    slug: "khoa-hoc",
    keywords: ["khóa", "excel", "tiếng anh", "figma", "ôn thi", "digital"],
  },
];

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
  if (hint && NICHE_KEYWORDS.some((n) => n.slug === hint)) {
    return hint;
  }
  const hay = normalizeTitle(title);
  let best = "gadget";
  let bestHits = 0;
  for (const niche of NICHE_KEYWORDS) {
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
