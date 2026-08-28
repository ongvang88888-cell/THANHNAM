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
});
