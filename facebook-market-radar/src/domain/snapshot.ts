import { PUBLISHER_PLATFORMS, type NormalizedAd, type PublisherPlatform } from "./ports";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type SnapshotParseResult =
  | { ok: true; ad: NormalizedAd }
  | { ok: false; error: string };

function asString(value: unknown, field: string): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (typeof value !== "string") {
    throw new Error(`${field} phải là chuỗi`);
  }
  return value.trim();
}

function requireString(value: unknown, field: string): string {
  const parsed = asString(value, field);
  if (!parsed) {
    throw new Error(`${field} bắt buộc`);
  }
  return parsed;
}

function parsePlatforms(value: unknown): PublisherPlatform[] {
  if (value === undefined || value === null) {
    return ["facebook"];
  }
  if (!Array.isArray(value)) {
    throw new Error("platforms phải là mảng");
  }
  const platforms: PublisherPlatform[] = [];
  for (const item of value) {
    if (typeof item !== "string") {
      throw new Error("platforms chỉ chứa chuỗi");
    }
    const lower = item.toLowerCase();
    if ((PUBLISHER_PLATFORMS as readonly string[]).includes(lower)) {
      platforms.push(lower as PublisherPlatform);
    }
  }
  return platforms.length > 0 ? platforms : ["facebook"];
}

export function parseAdSnapshot(payload: unknown): SnapshotParseResult {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return { ok: false, error: "Snapshot phải là object JSON" };
  }
  const raw = payload as Record<string, unknown>;
  try {
    const startDate = requireString(raw.startDate ?? raw.ad_delivery_start_time, "startDate");
    const dateOnly = startDate.slice(0, 10);
    if (!ISO_DATE.test(dateOnly)) {
      return { ok: false, error: "startDate phải dạng YYYY-MM-DD" };
    }
    const isActive =
      typeof raw.isActive === "boolean"
        ? raw.isActive
        : raw.ad_active_status === "ACTIVE" || raw.ad_active_status === undefined;
    const ad: NormalizedAd = {
      libraryId: requireString(raw.libraryId ?? raw.id, "libraryId"),
      pageId: requireString(raw.pageId ?? raw.page_id, "pageId"),
      pageName: requireString(raw.pageName ?? raw.page_name, "pageName"),
      body: asString(raw.body ?? raw.ad_creative_body, "body"),
      title: asString(raw.title ?? raw.ad_creative_link_title, "title"),
      startDate: dateOnly,
      isActive,
      platforms: parsePlatforms(raw.platforms ?? raw.publisher_platforms),
      snapshotUrl: asString(raw.snapshotUrl ?? raw.ad_snapshot_url, "snapshotUrl"),
      landingUrl: asString(raw.landingUrl, "landingUrl"),
      productHint: asString(raw.productHint ?? raw.productTitle, "productHint"),
      nicheHint: asString(raw.nicheHint ?? raw.nicheSlug, "nicheHint"),
    };
    if (!/^[0-9A-Za-z._-]+$/.test(ad.libraryId)) {
      return { ok: false, error: "libraryId không hợp lệ" };
    }
    return { ok: true, ad };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Snapshot không hợp lệ",
    };
  }
}
