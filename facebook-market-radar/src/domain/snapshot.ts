import { PUBLISHER_PLATFORMS, type NormalizedAd, type PublisherPlatform } from "./ports";
import { parseImageUrl } from "./product-image";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type SnapshotParseResult =
  | { ok: true; ad: NormalizedAd }
  | { ok: false; error: string };

function firstText(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === "string" && item.trim()) {
        return item.trim();
      }
    }
  }
  return null;
}

function pickText(raw: Record<string, unknown>, keys: readonly string[]): string | null {
  for (const key of keys) {
    const found = firstText(raw[key]);
    if (found) {
      return found;
    }
  }
  return null;
}

function requireText(raw: Record<string, unknown>, keys: readonly string[], field: string): string {
  const found = pickText(raw, keys);
  if (!found) {
    throw new Error(`${field} bắt buộc`);
  }
  return found;
}

function optionalHttpUrl(value: string | null): string | null {
  if (!value) {
    return null;
  }
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
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

function parseActive(raw: Record<string, unknown>): boolean {
  if (typeof raw.isActive === "boolean") {
    return raw.isActive;
  }
  if (raw.live === true || raw.running === true) {
    return true;
  }
  if (raw.live === false || raw.running === false) {
    return false;
  }
  const status = pickText(raw, ["ad_active_status", "status", "ad_status"]);
  if (!status) {
    return true;
  }
  const upper = status.toUpperCase();
  if (upper === "INACTIVE" || upper === "STOPPED" || upper === "PAUSED" || upper === "OFF") {
    return false;
  }
  return upper === "ACTIVE" || upper === "LIVE" || upper === "RUNNING" || upper === "ON";
}

export function snapshotReachedCountries(payload: unknown): string[] | null {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return null;
  }
  const raw = payload as Record<string, unknown>;
  const value = raw.ad_reached_countries ?? raw.reachedCountries ?? raw.countries ?? raw.country;
  if (typeof value === "string" && value.trim()) {
    return [value.trim().toUpperCase()];
  }
  if (!Array.isArray(value)) {
    return null;
  }
  const out = value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim().toUpperCase());
  return out.length > 0 ? out : null;
}

export function snapshotAdType(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return null;
  }
  const raw = payload as Record<string, unknown>;
  return pickText(raw, ["ad_type", "adType", "type"]);
}

export function parseAdSnapshot(payload: unknown): SnapshotParseResult {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return { ok: false, error: "Snapshot phải là object JSON" };
  }
  const raw = payload as Record<string, unknown>;
  try {
    const startDate = requireText(
      raw,
      ["startDate", "ad_delivery_start_time", "started_running", "start_date", "startedAt", "created_at"],
      "startDate",
    );
    const dateOnly = startDate.slice(0, 10);
    if (!ISO_DATE.test(dateOnly)) {
      return { ok: false, error: "startDate phải dạng YYYY-MM-DD" };
    }
    const libraryId = requireText(
      raw,
      ["libraryId", "ad_archive_id", "facebook_ad_id", "adArchiveId", "archive_id", "id"],
      "libraryId",
    );
    const pageId = requireText(raw, ["pageId", "page_id", "facebook_page_id", "pageID"], "pageId");
    const pageName = requireText(
      raw,
      ["pageName", "page_name", "brand_name", "brandName", "advertiser_name"],
      "pageName",
    );
    const body = pickText(raw, [
      "body",
      "ad_creative_body",
      "ad_creative_bodies",
      "description",
      "text",
      "transcript",
      "message",
    ]);
    const title = pickText(raw, [
      "title",
      "ad_creative_link_title",
      "ad_creative_link_titles",
      "headline",
      "product_name",
    ]);
    const productHint = pickText(raw, ["productHint", "productTitle", "product_name", "product", "headline"]);
    const nicheHint = pickText(raw, ["nicheHint", "nicheSlug", "category", "niches", "categories"]);
    const landing = optionalHttpUrl(
      pickText(raw, ["landingUrl", "link_url", "destination_url", "landing_page", "website", "link"]),
    );
    const imageRaw = pickText(raw, ["imageUrl", "image_url", "thumbnail", "thumbnail_url", "image"]);
    const ad: NormalizedAd = {
      libraryId,
      pageId,
      pageName,
      body,
      title,
      startDate: dateOnly,
      isActive: parseActive(raw),
      platforms: parsePlatforms(raw.platforms ?? raw.publisher_platforms),
      snapshotUrl: optionalHttpUrl(pickText(raw, ["snapshotUrl", "ad_snapshot_url", "url"])),
      landingUrl: landing,
      imageUrl: parseImageUrl(imageRaw ?? undefined),
      productHint,
      nicheHint,
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
