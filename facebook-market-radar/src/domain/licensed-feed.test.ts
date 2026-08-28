import { describe, expect, it } from "vitest";
import { filterNormalizedAds, parseLicensedFeed } from "./licensed-feed";

describe("licensed feed", () => {
  it("parses a licensed ads array", () => {
    const parsed = parseLicensedFeed({
      ads: [
        {
          libraryId: "1",
          pageId: "2",
          pageName: "Licensed Page",
          startDate: "2026-08-01",
          productHint: "Serum",
        },
      ],
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.ads).toHaveLength(1);
    }
  });

  it("rejects malformed feed", () => {
    expect(parseLicensedFeed(null).ok).toBe(false);
    expect(parseLicensedFeed({ ads: "nope" }).ok).toBe(false);
    expect(parseLicensedFeed({ ads: [{ pageName: "x" }] }).ok).toBe(false);
  });

  it("filters by search text", () => {
    const parsed = parseLicensedFeed({
      ads: [
        { libraryId: "1", pageId: "p1", pageName: "A", startDate: "2026-08-01", productHint: "Serum" },
        { libraryId: "2", pageId: "p2", pageName: "B", startDate: "2026-08-01", productHint: "Bỉm" },
      ],
    });
    if (!parsed.ok) {
      throw new Error("expected ok");
    }
    expect(filterNormalizedAds(parsed.ads, { searchText: "serum" })).toHaveLength(1);
  });
});
