import { parseAdLibraryUrl } from "./ad-library-url";
import { parseLandingUrl } from "./landing";
import { PUBLISHER_PLATFORMS, type NormalizedAd, type PublisherPlatform } from "./ports";
import { parseOptionalPriceVnd } from "./price";
import { parseImageUrl } from "./product-image";
import { parseAdSnapshot } from "./snapshot";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ID_RE = /^[0-9A-Za-z._-]{1,64}$/;

export type CollectManualInput = {
  sourceUrl?: string;
  snapshot?: unknown;
  libraryId?: string;
  pageId?: string;
  pageName?: string;
  body?: string;
  title?: string;
  startDate?: string;
  isActive?: boolean;
  platforms?: string[];
  landingUrl?: string;
  productTitle?: string;
  nicheSlug?: string;
  shopeeSold?: number;
  tiktokSold?: number;
  imageUrl?: string;
  listingPriceVnd?: number | string;
};

export type CollectManualResult =
  | {
      ok: true;
      ad: NormalizedAd;
      productTitle: string;
      nicheSlug: string | null;
      shopeeSold: number | null;
      tiktokSold: number | null;
      sourceUrl: string | null;
      imageUrl: string | null;
      listingPriceVnd: number | null;
    }
  | { ok: false; error: string };

function optionalSold(value: number | undefined): number | null {
  if (value === undefined) {
    return null;
  }
  if (!Number.isInteger(value) || value < 0 || value > 50_000_000) {
    throw new Error("sold phải là số nguyên 0–50000000");
  }
  return value;
}

function optionalListingPrice(value: number | string | undefined, snapshot?: unknown): number | null {
  if (typeof value === "string" && value.trim() === "") {
    return null;
  }
  if (value !== undefined) {
    return parseOptionalPriceVnd(value);
  }
  if (typeof snapshot === "object" && snapshot !== null && !Array.isArray(snapshot)) {
    const raw = snapshot as Record<string, unknown>;
    const fromSnap = raw.listingPriceVnd ?? raw.priceVnd;
    if (typeof fromSnap === "number" || typeof fromSnap === "string") {
      return parseOptionalPriceVnd(fromSnap);
    }
  }
  return null;
}

function parsePlatformList(value: string[] | undefined): PublisherPlatform[] {
  if (!value || value.length === 0) {
    return ["facebook"];
  }
  const out: PublisherPlatform[] = [];
  for (const item of value) {
    const lower = item.toLowerCase();
    if ((PUBLISHER_PLATFORMS as readonly string[]).includes(lower)) {
      out.push(lower as PublisherPlatform);
    }
  }
  return out.length > 0 ? out : ["facebook"];
}

export function validateCollectManual(input: CollectManualInput): CollectManualResult {
  try {
    if (input.snapshot !== undefined) {
      const parsed = parseAdSnapshot(input.snapshot);
      if (!parsed.ok) {
        return parsed;
      }
      const productTitle = (input.productTitle ?? parsed.ad.productHint ?? "").trim();
      if (productTitle.length < 2) {
        return { ok: false, error: "productTitle bắt buộc khi lưu snapshot" };
      }
      return {
        ok: true,
        ad: parsed.ad,
        productTitle,
        nicheSlug: input.nicheSlug ?? parsed.ad.nicheHint,
        shopeeSold: optionalSold(input.shopeeSold),
        tiktokSold: optionalSold(input.tiktokSold),
        sourceUrl: input.sourceUrl?.trim() || parsed.ad.snapshotUrl,
        imageUrl: parseImageUrl(input.imageUrl) ?? parsed.ad.imageUrl,
        listingPriceVnd: optionalListingPrice(input.listingPriceVnd, input.snapshot),
      };
    }

    let libraryId = input.libraryId?.trim() ?? "";
    let pageId = input.pageId?.trim() ?? "";
    const sourceUrl = input.sourceUrl?.trim() ?? "";
    if (sourceUrl) {
      const parsedUrl = parseAdLibraryUrl(sourceUrl);
      if (parsedUrl.kind === "invalid") {
        return { ok: false, error: parsedUrl.reason };
      }
      if (parsedUrl.kind === "ad" && !libraryId) {
        libraryId = parsedUrl.libraryId;
      }
      if (parsedUrl.kind === "page" && !pageId) {
        pageId = parsedUrl.pageId;
      }
      if (parsedUrl.kind === "search" && !libraryId) {
        return {
          ok: false,
          error: "URL search không có id ads — điền libraryId / page từ thẻ quảng cáo bạn đang xem",
        };
      }
    }

    const pageName = input.pageName?.trim() ?? "";
    const productTitle = input.productTitle?.trim() ?? "";
    const startDate = input.startDate?.trim() ?? "";
    if (!ID_RE.test(libraryId)) {
      return { ok: false, error: "libraryId bắt buộc (id trong URL Ad Library)" };
    }
    if (!ID_RE.test(pageId)) {
      return { ok: false, error: "pageId bắt buộc" };
    }
    if (pageName.length < 2 || pageName.length > 200) {
      return { ok: false, error: "pageName phải từ 2–200 ký tự" };
    }
    if (productTitle.length < 2 || productTitle.length > 200) {
      return { ok: false, error: "productTitle phải từ 2–200 ký tự" };
    }
    if (!ISO_DATE.test(startDate)) {
      return { ok: false, error: "startDate phải dạng YYYY-MM-DD" };
    }

    const ad: NormalizedAd = {
      libraryId,
      pageId,
      pageName,
      body: input.body?.trim() || null,
      title: input.title?.trim() || null,
      startDate,
      isActive: input.isActive !== false,
      platforms: parsePlatformList(input.platforms),
      snapshotUrl: sourceUrl || null,
      landingUrl: parseLandingUrl(input.landingUrl),
      productHint: productTitle,
      nicheHint: input.nicheSlug?.trim() || null,
      imageUrl: parseImageUrl(input.imageUrl),
    };

    return {
      ok: true,
      ad,
      productTitle,
      nicheSlug: input.nicheSlug?.trim() || null,
      shopeeSold: optionalSold(input.shopeeSold),
      tiktokSold: optionalSold(input.tiktokSold),
      sourceUrl: sourceUrl || null,
      imageUrl: ad.imageUrl,
      listingPriceVnd: optionalListingPrice(input.listingPriceVnd, input.snapshot),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Dữ liệu không hợp lệ",
    };
  }
}
