import { describe, expect, it } from "vitest";
import { creativeHash, detectAlerts } from "./alerts";

const now = Date.parse("2026-08-27T00:00:00.000Z");

describe("alerts", () => {
  it("flags new page and creative within 7 days", () => {
    const alerts = detectAlerts({
      pageId: "900024",
      pageName: "TaiNghe Tot",
      pageFirstSeenMs: now - 2 * 86_400_000,
      creativeHash: "abc",
      creativeFirstSeenMs: now - 86_400_000,
      clusterSlug: "tai-nghe-chong-on",
      newAdsLast7Days: 1,
      previousWeekNewAds: 0,
      nowMs: now,
    });
    expect(alerts.map((a) => a.type)).toEqual(["NEW_PAGE", "NEW_CREATIVE"]);
  });

  it("flags surge when new ads double week-over-week", () => {
    const alerts = detectAlerts({
      pageId: "900001",
      pageName: "LanHa Skin Lab",
      pageFirstSeenMs: now - 90 * 86_400_000,
      creativeHash: "old",
      creativeFirstSeenMs: now - 90 * 86_400_000,
      clusterSlug: "serum-nia",
      newAdsLast7Days: 6,
      previousWeekNewAds: 2,
      nowMs: now,
    });
    expect(alerts.map((a) => a.type)).toEqual(["SURGE"]);
  });

  it("hashes creative stably", () => {
    const a = creativeHash({ libraryId: "1", body: "hello", title: "t" });
    const b = creativeHash({ libraryId: "1", body: "hello", title: "t" });
    const c = creativeHash({ libraryId: "1", body: "other", title: "t" });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});
