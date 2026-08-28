import { describe, expect, it } from "vitest";
import { assertLicensedFeedUrl, isBlockedLicensedHost } from "./licensed-host";

describe("licensed feed URL", () => {
  it("accepts https vendor hosts", () => {
    const checked = assertLicensedFeedUrl("https://public.api.foreplay.co/api/swipefile/ads");
    expect(checked.ok).toBe(true);
  });

  it("rejects Facebook and Meta hosts", () => {
    expect(assertLicensedFeedUrl("https://graph.facebook.com/v26.0/ads_archive").ok).toBe(false);
    expect(assertLicensedFeedUrl("https://www.facebook.com/ads/library").ok).toBe(false);
    expect(assertLicensedFeedUrl("http://example.com/feed").ok).toBe(false);
    expect(isBlockedLicensedHost("scontent.xx.fbcdn.net")).toBe(true);
  });

  it("rejects marketplace and ad-library hosts used as fake licensed feeds", () => {
    expect(assertLicensedFeedUrl("https://shopee.vn/search?keyword=serum").ok).toBe(false);
    expect(assertLicensedFeedUrl("https://adstransparency.google.com/?region=VN").ok).toBe(false);
    expect(assertLicensedFeedUrl("https://www.youtube.com/results?search_query=serum").ok).toBe(false);
    expect(assertLicensedFeedUrl("https://www.lazada.vn/catalog/?q=serum").ok).toBe(false);
    expect(isBlockedLicensedHost("www.tiktok.com")).toBe(true);
  });
});
