import { parseAdSnapshot } from "./snapshot";
import type { NormalizedAd } from "./ports";

export type LicensedFeedParseResult =
  | { ok: true; ads: NormalizedAd[] }
  | { ok: false; error: string };

export function parseLicensedFeed(payload: unknown): LicensedFeedParseResult {
  if (typeof payload !== "object" || payload === null) {
    return { ok: false, error: "Licensed feed phải là object JSON" };
  }
  const raw = payload as Record<string, unknown>;
  const items = raw.ads ?? raw.items;
  if (!Array.isArray(items)) {
    return { ok: false, error: "Licensed feed cần mảng ads[]" };
  }
  if (items.length > 10_000) {
    return { ok: false, error: "Licensed feed vượt 10000 ads / lần đọc" };
  }
  const ads: NormalizedAd[] = [];
  for (let i = 0; i < items.length; i += 1) {
    const parsed = parseAdSnapshot(items[i]);
    if (!parsed.ok) {
      return { ok: false, error: `ads[${i}]: ${parsed.error}` };
    }
    ads.push(parsed.ad);
  }
  return { ok: true, ads };
}

export function filterNormalizedAds(
  ads: NormalizedAd[],
  query: { libraryId?: string; pageId?: string; searchText?: string },
): NormalizedAd[] {
  const search = query.searchText?.trim().toLowerCase();
  return ads.filter((ad) => {
    if (query.libraryId && ad.libraryId !== query.libraryId) {
      return false;
    }
    if (query.pageId && ad.pageId !== query.pageId) {
      return false;
    }
    if (!search) {
      return true;
    }
    const hay = `${ad.pageName} ${ad.title ?? ""} ${ad.body ?? ""} ${ad.productHint ?? ""}`.toLowerCase();
    return hay.includes(search);
  });
}
