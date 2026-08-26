export type CatalogPrice = {
  currency: string;
  amountMinor: number;
  compareAtMinor: number | null;
};

export type CatalogProduct = {
  id: string;
  type: string;
  name: string;
  slug: string;
  description: string | null;
  thumbnailUrl?: string | null;
  category?: string | null;
  price: CatalogPrice | null;
};

export type CatalogCampaign = {
  badgeText: string;
  percentOff: number | null;
  endsAt: string;
  products: Array<{ productId: string }>;
};

const COVER_PALETTES: Array<[string, string]> = [
  ["#14213d", "#f05a28"],
  ["#1b2a4a", "#fb923c"],
  ["#0f172a", "#ea580c"],
  ["#1e3a5f", "#f97316"],
  ["#111827", "#fdba74"],
  ["#1a365d", "#f05a28"],
  ["#0b132b", "#e85d04"],
  ["#243b55", "#ff7a45"],
];

export function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function coverStyle(seed: string): { background: string } {
  const [from, to] = COVER_PALETTES[hashSeed(seed) % COVER_PALETTES.length] ?? COVER_PALETTES[0];
  return { background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` };
}

export function discountPercent(amountMinor: number, compareAtMinor: number | null): number | null {
  if (!compareAtMinor || compareAtMinor <= amountMinor) return null;
  return Math.round(((compareAtMinor - amountMinor) / compareAtMinor) * 100);
}

export function isBundleType(type: string): boolean {
  return type.includes("BUNDLE");
}

export function isCourseType(type: string): boolean {
  return type === "VIDEO_COURSE";
}

export function instructorLabel(product: CatalogProduct): string {
  if (product.type === "DIGITAL_DOCUMENT") return "Tài liệu Unica";
  if (isBundleType(product.type)) return "Combo Unica";
  if (product.type === "SUBSCRIPTION" || product.type === "PREMIUM_LIBRARY") return "Hội viên Unica";
  return "Giảng viên Unica";
}

export function asCatalogProduct(raw: {
  id: string;
  type: string;
  name: string;
  slug: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  category?: string | { slug?: string } | null;
  price?: CatalogPrice | null;
  prices?: Array<{ currency: string; amountMinor: number; compareAtMinor?: number | null }>;
}): CatalogProduct {
  const price = raw.price
    ?? (raw.prices?.[0]
      ? {
          currency: raw.prices[0].currency,
          amountMinor: raw.prices[0].amountMinor,
          compareAtMinor: raw.prices[0].compareAtMinor ?? null,
        }
      : null);
  return {
    id: raw.id,
    type: raw.type,
    name: raw.name,
    slug: raw.slug,
    description: raw.description ?? null,
    thumbnailUrl: raw.thumbnailUrl,
    category: typeof raw.category === "string" ? raw.category : raw.category?.slug ?? null,
    price,
  };
}

export function splitDescription(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split(/[\n•·]|\. /)
    .map((part) => part.replace(/^[-\s]+/, "").trim())
    .filter((part) => part.length >= 12)
    .slice(0, 10);
}
