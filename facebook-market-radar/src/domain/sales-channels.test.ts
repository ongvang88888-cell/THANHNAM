import { describe, expect, it } from "vitest";
import {
  SALES_CHANNELS,
  buildGoogleAdsTransparencyUrl,
  buildShopeeSearchUrl,
  isSoldMetricSource,
  officialResearchLinks,
  parseChannelMetricSource,
} from "./sales-channels";

describe("sales channels", () => {
  it("maps legal channels and blocks scrapers", () => {
    expect(SALES_CHANNELS.some((row) => row.id === "google_ads_transparency")).toBe(true);
    expect(SALES_CHANNELS.some((row) => row.id === "youtube_public")).toBe(true);
    expect(SALES_CHANNELS.some((row) => row.id === "shopee_public")).toBe(true);
    const blocked = SALES_CHANNELS.find((row) => row.id === "blocked_scrapers");
    expect(blocked?.ingest).toBe("blocked");
    const blob = JSON.stringify(SALES_CHANNELS).toLowerCase();
    expect(blob).toContain("cấm");
    expect(SALES_CHANNELS.filter((row) => row.ingest !== "blocked").every((row) => row.missing.length > 0)).toBe(
      true,
    );
  });

  it("builds official research URLs without fetching", () => {
    const google = buildGoogleAdsTransparencyUrl("serum niacinamide");
    expect(google.startsWith("https://adstransparency.google.com/")).toBe(true);
    expect(google).toContain("region=VN");
    expect(google).toContain("serum");
    expect(buildShopeeSearchUrl("đèn led")).toContain("shopee.vn/search");
    const links = officialResearchLinks("Serum Niacinamide");
    expect(links.metaAdLibrary).toContain("facebook.com/ads/library");
    expect(links.youtube).toContain("youtube.com/results");
    expect(links.tiktokTopAds).toContain("creativecenter");
    expect(links.trends).toContain("trends.google.com");
    expect(links.lazada).toContain("lazada.vn");
    expect(links.sendo).toContain("sendo.vn");
  });

  it("keeps sold sources separate from views and ads-seen", () => {
    expect(isSoldMetricSource("SHOPEE")).toBe(true);
    expect(isSoldMetricSource("YOUTUBE_VIEWS")).toBe(false);
    expect(parseChannelMetricSource("lazada")).toBe("LAZADA");
    expect(parseChannelMetricSource("facebook")).toBeNull();
  });
});
