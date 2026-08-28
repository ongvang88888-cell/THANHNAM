import { describe, expect, it } from "vitest";
import { assertOfficialStatsUrl, isOfficialStatsHost } from "./official-stats-host";

describe("official stats host allowlist", () => {
  it("allows googleapis YouTube and Custom Search paths only", () => {
    expect(assertOfficialStatsUrl("https://www.googleapis.com/youtube/v3/videos?id=a").ok).toBe(true);
    expect(assertOfficialStatsUrl("https://www.googleapis.com/youtube/v3/search?q=serum").ok).toBe(true);
    expect(assertOfficialStatsUrl("https://www.googleapis.com/customsearch/v1?q=serum").ok).toBe(true);
    expect(assertOfficialStatsUrl("https://www.googleapis.com/youtube/v3/commentThreads").ok).toBe(false);
    expect(isOfficialStatsHost("www.googleapis.com", "/youtube/v3/videos")).toBe(true);
  });

  it("allows partner shop APIs and rejects marketplace HTML", () => {
    expect(assertOfficialStatsUrl("https://partner.shopeemobile.com/api/v2/product/get_item_list").ok).toBe(true);
    expect(assertOfficialStatsUrl("https://api.lazada.vn/rest/products/get").ok).toBe(true);
    expect(assertOfficialStatsUrl("https://open-api.tiktokglobalshop.com/product/202309/products/search").ok).toBe(
      true,
    );
    expect(assertOfficialStatsUrl("https://shopee.vn/search?keyword=serum").ok).toBe(false);
    expect(assertOfficialStatsUrl("https://tiki.vn/api/v2/products?limit=50").ok).toBe(false);
    expect(assertOfficialStatsUrl("https://www.youtube.com/results?search_query=serum").ok).toBe(false);
    expect(assertOfficialStatsUrl("https://adstransparency.google.com/?region=VN").ok).toBe(false);
    expect(assertOfficialStatsUrl("http://www.googleapis.com/youtube/v3/videos").ok).toBe(false);
  });
});
