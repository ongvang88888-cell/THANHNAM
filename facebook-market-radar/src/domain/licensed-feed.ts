import { parseAdSnapshot, snapshotAdType, snapshotReachedCountries } from "./snapshot";
import type { NormalizedAd } from "./ports";

export type LicensedFeedParseResult =
  | { ok: true; ads: NormalizedAd[]; skipped: number; errors: string[] }
  | { ok: false; error: string };

export type LicensedFeedOptions = {
  requireCountry?: string;
  skipPolitical?: boolean;
};

const MAX_ITEMS = 10_000;

function extractItems(payload: unknown): unknown[] | { error: string } {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (typeof payload !== "object" || payload === null) {
    return { error: "Licensed feed phải là object JSON" };
  }
  const raw = payload as Record<string, unknown>;
  if (Array.isArray(raw.ads)) {
    return raw.ads;
  }
  if (Array.isArray(raw.items)) {
    return raw.items;
  }
  if (Array.isArray(raw.data)) {
    return raw.data;
  }
  if (typeof raw.data === "object" && raw.data !== null) {
    const inner = raw.data as Record<string, unknown>;
    if (Array.isArray(inner.ads)) {
      return inner.ads;
    }
    if (Array.isArray(inner.items)) {
      return inner.items;
    }
  }
  return { error: "Licensed feed cần mảng ads[], items[] hoặc data[]" };
}

function countryAllowed(item: unknown, requireCountry: string | undefined): boolean {
  if (!requireCountry) {
    return true;
  }
  const reached = snapshotReachedCountries(item);
  if (!reached) {
    return true;
  }
  const want = requireCountry.toUpperCase();
  return reached.includes(want) || reached.includes("ALL");
}

function isPoliticalAd(item: unknown): boolean {
  const type = snapshotAdType(item)?.toUpperCase() ?? "";
  return type === "POLITICAL_AND_ISSUE_ADS" || type === "POLITICAL";
}

export function parseLicensedFeed(
  payload: unknown,
  options: LicensedFeedOptions = {},
): LicensedFeedParseResult {
  const items = extractItems(payload);
  if (!Array.isArray(items)) {
    return { ok: false, error: items.error };
  }
  if (items.length > MAX_ITEMS) {
    return { ok: false, error: "Licensed feed vượt 10000 ads / lần đọc" };
  }
  if (items.length === 0) {
    return { ok: true, ads: [], skipped: 0, errors: [] };
  }
  const requireCountry = options.requireCountry ?? "VN";
  const skipPolitical = options.skipPolitical !== false;
  const ads: NormalizedAd[] = [];
  const errors: string[] = [];
  let skipped = 0;
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    if (skipPolitical && isPoliticalAd(item)) {
      skipped += 1;
      errors.push(`ads[${i}]: bỏ ads chính trị/vấn đề — không vào kho ngành hàng`);
      continue;
    }
    if (!countryAllowed(item, requireCountry)) {
      skipped += 1;
      errors.push(`ads[${i}]: không reach ${requireCountry}`);
      continue;
    }
    const parsed = parseAdSnapshot(item);
    if (!parsed.ok) {
      skipped += 1;
      errors.push(`ads[${i}]: ${parsed.error}`);
      continue;
    }
    ads.push(parsed.ad);
  }
  if (ads.length === 0) {
    return { ok: false, error: errors[0] ?? "Licensed feed không có ads hợp lệ" };
  }
  return { ok: true, ads, skipped, errors };
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

export function licensedPayloadLooksPresent(payload: unknown): boolean {
  if (payload === null || payload === undefined) {
    return false;
  }
  if (Array.isArray(payload)) {
    return payload.length > 0;
  }
  if (typeof payload !== "object") {
    return false;
  }
  const raw = payload as Record<string, unknown>;
  const has = (value: unknown): boolean => Array.isArray(value) && value.length > 0;
  return has(raw.ads) || has(raw.items) || has(raw.data);
}
