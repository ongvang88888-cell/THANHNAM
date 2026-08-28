import { describe, expect, it } from "vitest";
import { cseQueryForSite, officialListingUrl, parseGoogleCseItems } from "./google-cse";

describe("Google Custom Search listing filter", () => {
  it("builds site: queries and keeps only matching hosts", () => {
    expect(cseQueryForSite("Serum vitamin C", "tiki")).toBe("Serum vitamin C site:tiki.vn");
    expect(officialListingUrl("https://tiki.vn/serum-p1.html", "tiki")).toContain("tiki.vn");
    expect(officialListingUrl("https://shopee.vn/serum", "tiki")).toBeNull();
    const hits = parseGoogleCseItems(
      {
        items: [
          { link: "https://tiki.vn/serum-p9.html", title: "Serum" },
          { link: "https://www.facebook.com/ads/library", title: "nope" },
          { link: "https://shopee.vn/x", title: "wrong site" },
        ],
      },
      "tiki",
    );
    expect(hits).toEqual([{ url: "https://tiki.vn/serum-p9.html", title: "Serum", site: "tiki" }]);
  });
});
