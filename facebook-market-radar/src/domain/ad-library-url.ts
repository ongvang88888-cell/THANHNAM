export type ParsedAdLibraryUrl =
  | {
      kind: "ad";
      libraryId: string;
      country: string | null;
      sourceUrl: string;
    }
  | {
      kind: "page";
      pageId: string;
      country: string | null;
      sourceUrl: string;
    }
  | {
      kind: "search";
      query: string;
      country: string | null;
      sourceUrl: string;
    }
  | { kind: "invalid"; reason: string };

const AD_LIBRARY_HOSTS = new Set(["www.facebook.com", "facebook.com", "web.facebook.com"]);

/** Official Ad Library search — user opens Meta; server never fetches this URL. */
export function buildAdLibrarySearchUrl(query: string, country = "VN"): string {
  const q = query.trim();
  const params = new URLSearchParams({
    active_status: "active",
    ad_type: "all",
    country,
    is_targeted_country: "false",
    media_type: "all",
    search_type: "keyword_unordered",
    q,
  });
  return `https://www.facebook.com/ads/library/?${params.toString()}`;
}

function isAdLibraryPath(pathname: string): boolean {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  return (
    normalized === "/ads/library" ||
    normalized === "/ads/library/" ||
    normalized.startsWith("/ads/library/")
  );
}

export function parseAdLibraryUrl(raw: string): ParsedAdLibraryUrl {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { kind: "invalid", reason: "URL trống" };
  }
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { kind: "invalid", reason: "URL không hợp lệ" };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { kind: "invalid", reason: "Chỉ chấp nhận http(s)" };
  }
  if (!AD_LIBRARY_HOSTS.has(url.hostname.toLowerCase())) {
    return { kind: "invalid", reason: "Không phải facebook.com/ads/library" };
  }
  if (!isAdLibraryPath(url.pathname)) {
    return { kind: "invalid", reason: "Không phải facebook.com/ads/library" };
  }

  const country = url.searchParams.get("country");
  const libraryId = url.searchParams.get("id");
  if (libraryId && /^[0-9]+$/.test(libraryId)) {
    return { kind: "ad", libraryId, country, sourceUrl: url.toString() };
  }

  const pageId = url.searchParams.get("view_all_page_id");
  if (pageId && /^[0-9]+$/.test(pageId)) {
    return { kind: "page", pageId, country, sourceUrl: url.toString() };
  }

  const query = url.searchParams.get("q");
  if (query && query.trim().length > 0) {
    return { kind: "search", query: query.trim(), country, sourceUrl: url.toString() };
  }

  return {
    kind: "invalid",
    reason: "URL Ad Library thiếu id, view_all_page_id hoặc q — điền tay các trường bắt buộc",
  };
}
