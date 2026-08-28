import { describe, expect, it } from "vitest";
import { buildAdLibrarySearchUrl, parseAdLibraryUrl } from "./ad-library-url";

describe("parseAdLibraryUrl", () => {
  it("reads ad id", () => {
    const parsed = parseAdLibraryUrl(
      "https://www.facebook.com/ads/library/?id=111000001&country=VN",
    );
    expect(parsed).toMatchObject({ kind: "ad", libraryId: "111000001", country: "VN" });
  });

  it("reads page and search", () => {
    expect(
      parseAdLibraryUrl("https://facebook.com/ads/library/?view_all_page_id=900001&country=VN"),
    ).toMatchObject({ kind: "page", pageId: "900001" });
    expect(
      parseAdLibraryUrl(
        "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=VN&q=serum%20niacinamide",
      ),
    ).toMatchObject({ kind: "search", query: "serum niacinamide", country: "VN" });
  });

  it("builds official active VN search urls without fetching", () => {
    const url = buildAdLibrarySearchUrl("serum niacinamide");
    expect(url.startsWith("https://www.facebook.com/ads/library/?")).toBe(true);
    expect(url).toContain("active_status=active");
    expect(url).toContain("country=VN");
    expect(url).toContain("search_type=keyword_unordered");
    expect(url).toContain("q=serum+niacinamide");
  });

  it("rejects non-library and empty urls", () => {
    expect(parseAdLibraryUrl("").kind).toBe("invalid");
    expect(parseAdLibraryUrl("https://example.com/ads").kind).toBe("invalid");
    expect(parseAdLibraryUrl("https://www.facebook.com/marketplace").kind).toBe("invalid");
  });
});
