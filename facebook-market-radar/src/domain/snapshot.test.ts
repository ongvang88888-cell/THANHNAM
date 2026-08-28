import { describe, expect, it } from "vitest";
import { parseAdSnapshot, snapshotReachedCountries } from "./snapshot";

describe("ad snapshot aliases", () => {
  it("maps Meta ads_archive fields", () => {
    const parsed = parseAdSnapshot({
      id: "1985926021790917",
      page_id: "183869772601",
      page_name: "Archive Shop",
      ad_delivery_start_time: "2026-08-01T19:02:04+0000",
      ad_creative_bodies: ["Serum vitamin C 189.000đ"],
      ad_creative_link_titles: ["Serum vitamin C"],
      publisher_platforms: ["facebook", "instagram"],
      ad_snapshot_url: "https://www.facebook.com/ads/library/?id=1985926021790917",
      ad_reached_countries: ["VN"],
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.ad.libraryId).toBe("1985926021790917");
      expect(parsed.ad.body).toContain("Serum");
      expect(parsed.ad.platforms).toContain("instagram");
    }
    expect(snapshotReachedCountries({ ad_reached_countries: ["vn"] })).toEqual(["VN"]);
  });

  it("maps Foreplay-like vendor fields and drops javascript landing", () => {
    const parsed = parseAdSnapshot({
      facebook_ad_id: "999888",
      page_id: "111",
      brand_name: "Vendor Brand",
      headline: "Kem chống nắng",
      transcript: "SPF50 cho da dầu",
      started_running: "2026-08-02",
      live: true,
      link_url: "javascript:alert(1)",
      thumbnail: "https://cdn.example.com/a.jpg",
      niches: ["Beauty"],
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.ad.libraryId).toBe("999888");
      expect(parsed.ad.pageName).toBe("Vendor Brand");
      expect(parsed.ad.landingUrl).toBeNull();
      expect(parsed.ad.imageUrl).toBe("https://cdn.example.com/a.jpg");
      expect(parsed.ad.isActive).toBe(true);
    }
  });
});
