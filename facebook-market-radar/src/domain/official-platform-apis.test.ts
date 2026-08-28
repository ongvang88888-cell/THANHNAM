import { describe, expect, it } from "vitest";
import {
  OFFICIAL_PLATFORM_APIS,
  blockedOfficialApiIds,
  ownAccountOfficialApiIds,
  wiredOfficialApiIds,
} from "./official-platform-apis";

describe("official platform API catalog", () => {
  it("never claims competitor sold or HeatScore from an API", () => {
    expect(OFFICIAL_PLATFORM_APIS.length).toBeGreaterThanOrEqual(10);
    expect(OFFICIAL_PLATFORM_APIS.every((row) => row.competitorSold === false)).toBe(true);
    expect(OFFICIAL_PLATFORM_APIS.every((row) => row.heatScore === false)).toBe(true);
    const ids = OFFICIAL_PLATFORM_APIS.map((row) => row.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("wires public googleapis and own-shop partner hosts; blocks archive/transparency dumps", () => {
    const wired = wiredOfficialApiIds();
    expect(wired).toContain("youtube_videos_list");
    expect(wired).toContain("youtube_search_list");
    expect(wired).toContain("google_cse_listings");
    expect(wired).toContain("shopee_open_own");
    expect(wired).toContain("user_typed_metrics");
    expect(blockedOfficialApiIds()).toContain("meta_ads_archive");
    expect(blockedOfficialApiIds()).toContain("google_ads_transparency_api");
    expect(ownAccountOfficialApiIds()).toContain("shopee_open_own");
    expect(ownAccountOfficialApiIds()).toContain("meta_marketing_own");
  });
});
