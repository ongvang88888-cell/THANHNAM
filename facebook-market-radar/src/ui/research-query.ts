export type ResearchQuery = {
  ten?: string;
  niche?: string;
  group?: string;
  view?: string;
  minDays?: string;
  minPages?: string;
  landing?: string;
  landingKind?: string;
  angle?: string;
  media?: string;
  minPrice?: string;
  maxPrice?: string;
  lane?: string;
  shop?: string;
  sort?: string;
  kenh?: string;
};

const FILTER_KEYS = [
  "ten",
  "niche",
  "group",
  "minDays",
  "minPages",
  "landing",
  "landingKind",
  "angle",
  "media",
  "minPrice",
  "maxPrice",
  "lane",
  "shop",
] as const;

export function researchHref(path: string, current: ResearchQuery, patch: Partial<ResearchQuery> = {}): string {
  const merged = { ...current, ...patch };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    const trimmed = value?.trim() ?? "";
    if (trimmed && trimmed !== "any" && trimmed !== "all") {
      params.set(key, trimmed);
    }
  }
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export function queryFromParams(params: Record<string, string | undefined>): ResearchQuery {
  return {
    ten: params.ten,
    niche: params.niche,
    group: params.group,
    view: params.view,
    minDays: params.minDays,
    minPages: params.minPages,
    landing: params.landing,
    landingKind: params.landingKind,
    angle: params.angle,
    media: params.media,
    minPrice: params.minPrice,
    maxPrice: params.maxPrice,
    lane: params.lane,
    shop: params.shop,
    sort: params.sort,
    kenh: params.kenh,
  };
}

export function hasActiveResearchQuery(query: ResearchQuery): boolean {
  return FILTER_KEYS.some((key) => {
    const value = query[key]?.trim() ?? "";
    return value.length > 0 && value !== "any" && value !== "all";
  });
}
