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

  it("accepts Meta data[] and skips political / non-VN rows", () => {
    const parsed = parseLicensedFeed({
      data: [
        {
          id: "1",
          page_id: "p1",
          page_name: "VN Shop",
          ad_delivery_start_time: "2026-08-01",
          productHint: "Serum",
          ad_reached_countries: ["VN"],
        },
        {
          id: "2",
          page_id: "p2",
          page_name: "EU Shop",
          ad_delivery_start_time: "2026-08-01",
          productHint: "Serum",
          ad_reached_countries: ["GB"],
        },
        {
          id: "3",
          page_id: "p3",
          page_name: "Party",
          ad_delivery_start_time: "2026-08-01",
          productHint: "Vote",
          ad_type: "POLITICAL_AND_ISSUE_ADS",
          ad_reached_countries: ["VN"],
        },
      ],
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.ads.map((ad) => ad.libraryId)).toEqual(["1"]);
      expect(parsed.skipped).toBe(2);
    }
  });

  it("keeps valid rows when some snapshots fail", () => {
    const parsed = parseLicensedFeed({
      ads: [
        { pageName: "x" },
        { libraryId: "9", pageId: "8", pageName: "Ok", startDate: "2026-08-01", productHint: "Bỉm" },
      ],
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.ads).toHaveLength(1);
      expect(parsed.skipped).toBe(1);
    }
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
