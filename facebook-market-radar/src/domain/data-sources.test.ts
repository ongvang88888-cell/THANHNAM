import { describe, expect, it } from "vitest";
import {
  DATA_SOURCES,
  SOURCE_FAMILIES,
  autoSyncSourceIds,
  blockedSourceIds,
  sourceById,
  wiredVnCommercialSourceIds,
} from "./data-sources";

describe("data source catalog", () => {
  it("has unique ids covering every family", () => {
    const ids = DATA_SOURCES.map((row) => row.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThanOrEqual(20);
    for (const family of SOURCE_FAMILIES) {
      expect(DATA_SOURCES.some((row) => row.family === family)).toBe(true);
    }
  });

  it("wires human save and licensed ingest for VN commercial research", () => {
    const wired = wiredVnCommercialSourceIds();
    expect(wired).toContain("meta_ad_library_ui");
    expect(wired).toContain("collect_manual");
    expect(wired).toContain("collect_sheet");
    expect(wired).toContain("licensed_json_file");
    expect(wired).toContain("licensed_http_feed");
  });

  it("does not auto-sync official Graph, scrapers, or own-ads into market HeatScore", () => {
    const auto = autoSyncSourceIds();
    expect(auto).not.toContain("meta_ads_archive_api");
    expect(auto).not.toContain("meta_marketing_api");
    expect(auto).not.toContain("scrape_ad_library");
    expect(auto).not.toContain("scraper_wrappers");
    expect(auto).not.toContain("scrape_shopee_tiktok");
    expect(auto).not.toContain("competitor_pixel_roas");
    expect(auto).not.toContain("meta_content_library_casd");
  });

  it("marks Meta commercial-VN gaps and scrape paths as blocked", () => {
    const blocked = blockedSourceIds();
    expect(blocked).toContain("meta_ads_archive_api");
    expect(blocked).toContain("meta_content_library_casd");
    expect(blocked).toContain("scrape_ad_library");
    expect(sourceById("meta_ads_archive_api")?.vnCommercial).toBe("no");
    expect(sourceById("meta_marketing_api")?.radarPort).toBe("own_ads");
    expect(sourceById("meta_marketing_api")?.vnCommercial).toBe("no");
  });
});
