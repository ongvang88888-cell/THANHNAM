import { describe, expect, it } from "vitest";
import { buildChannelAnalysisRow } from "./channel-analysis";
import type { PriceEstimate } from "./price";
import {
  buildCollectQueue,
  buildPlatformCoverage,
  buildPlatformDashboard,
  formatObservedVi,
  hasLandingPresence,
  hasPlatformData,
  parsePlatformTab,
  platformHref,
  rankForPlatform,
} from "./platform-dashboards";
import type { RankingRow } from "./weekly-report";

const PRICE: PriceEstimate = {
  lowVnd: 100_000,
  highVnd: 200_000,
  midVnd: 150_000,
  confidence: "thap",
  sources: ["catalog"],
  label: "≈ 150.000đ",
  note: "test",
};

function ranking(partial: Partial<RankingRow> & Pick<RankingRow, "clusterSlug">): RankingRow {
  return {
    clusterTitle: partial.clusterTitle ?? partial.clusterSlug,
    nicheSlug: "gadget",
    nicheName: "Gadget",
    activeAdCount: 2,
    totalAdCount: 2,
    distinctPageCount: 2,
    imageUrls: [],
    price: PRICE,
    scores: {
      intensity: 40,
      longevity: 60,
      velocity: 10,
      salesProxy: 20,
      heat: 38,
      estimated: true,
    },
    ...partial,
  };
}

describe("platform dashboards", () => {
  it("parses tabs and never claims auto-crawl", () => {
    expect(parsePlatformTab("SHOPEE")).toBe("shopee");
    expect(parsePlatformTab("x")).toBe("facebook");
    expect(platformHref("lazada", { base: "kenh" })).toBe("/kenh/lazada");
    expect(platformHref("google", { base: "home", niche: "my-pham" })).toBe("/?kenh=google&niche=my-pham");
    expect(platformHref("shopee", { base: "top", niche: "me-be" })).toBe("/top/shopee?niche=me-be");
    expect(platformHref("google", { base: "trend" })).toBe("/xu-huong?kenh=google");
    expect(parsePlatformTab(undefined, "shopee")).toBe("shopee");
  });

  it("ranks each marketplace from warehouse peaks and keeps YouTube views off sold", () => {
    const shopee = buildChannelAnalysisRow(
      ranking({ clusterSlug: "a", clusterTitle: "A", scores: { intensity: 10, longevity: 10, velocity: 5, salesProxy: 10, heat: 12, estimated: true } }),
      [{ clusterSlug: "a", source: "SHOPEE", value: 800, observedMs: 20 }],
      [],
    );
    const lazada = buildChannelAnalysisRow(
      ranking({ clusterSlug: "b", clusterTitle: "B" }),
      [
        { clusterSlug: "b", source: "LAZADA", value: 90, observedMs: 40 },
        { clusterSlug: "b", source: "YOUTUBE_VIEWS", value: 80_000, observedMs: 40 },
      ],
      [],
      { platforms: ["facebook", "instagram"], lastSeenMs: 40 },
    );
    expect(hasPlatformData(shopee, "shopee")).toBe(true);
    expect(hasPlatformData(shopee, "lazada")).toBe(false);
    expect(hasPlatformData(lazada, "youtube")).toBe(true);
    expect(hasPlatformData(lazada, "instagram")).toBe(true);
    expect(rankForPlatform([shopee, lazada], "shopee")[0]?.clusterSlug).toBe("a");
    expect(rankForPlatform([shopee, lazada], "lazada")[0]?.clusterSlug).toBe("b");
    expect(rankForPlatform([shopee, lazada], "youtube")[0]?.clusterSlug).toBe("b");
    const coverage = buildPlatformCoverage([shopee, lazada], [
      { clusterSlug: "a", source: "SHOPEE", value: 800, observedMs: 20 },
      { clusterSlug: "b", source: "LAZADA", value: 90, observedMs: 40 },
    ]);
    const shop = coverage.find((row) => row.id === "shopee");
    const laz = coverage.find((row) => row.id === "lazada");
    expect(shop?.productsWithData).toBe(1);
    expect(shop?.metricSum).toBe(800);
    expect(shop?.autoCrawl).toBe(false);
    expect(laz?.lastObservedMs).toBe(40);
    const ig = coverage.find((row) => row.id === "instagram");
    expect(ig?.lastObservedMs).toBe(40);
    const dashboard = buildPlatformDashboard({
      rows: [shopee, lazada],
      observations: [{ clusterSlug: "b", source: "YOUTUBE_VIEWS", value: 80_000, observedMs: 40 }],
      tab: "youtube",
      nowMs: 40 + 3_600_000,
      titleBySlug: new Map([
        ["a", "A"],
        ["b", "B"],
      ]),
    });
    expect(dashboard.autoCrawl).toBe(false);
    expect(dashboard.nationalDump).toBe(false);
    expect(dashboard.withDataCount).toBe(1);
    expect(dashboard.timeline[0]?.source).toBe("YOUTUBE_VIEWS");
    expect(formatObservedVi(40, 40 + 3_600_000)).toBe("1 giờ trước");
  });

  it("counts saved Tiki landings separately from entered sold and builds a fill queue", () => {
    const withLanding = buildChannelAnalysisRow(
      ranking({ clusterSlug: "c", clusterTitle: "Serum Tiki", scores: { intensity: 10, longevity: 10, velocity: 5, salesProxy: 0, heat: 20, estimated: true } }),
      [],
      ["https://tiki.vn/serum-p1"],
    );
    const blank = buildChannelAnalysisRow(ranking({ clusterSlug: "d", clusterTitle: "Blank" }), [], []);
    expect(hasPlatformData(withLanding, "tiki")).toBe(false);
    expect(hasLandingPresence(withLanding, "tiki")).toBe(true);
    expect(hasLandingPresence(blank, "tiki")).toBe(false);
    expect(rankForPlatform([blank, withLanding], "tiki")[0]?.clusterSlug).toBe("c");
    const coverage = buildPlatformCoverage([withLanding, blank], []);
    const tiki = coverage.find((row) => row.id === "tiki");
    expect(tiki?.productsWithData).toBe(0);
    expect(tiki?.productsWithLanding).toBe(1);
    expect(tiki?.landingCoveragePercent).toBe(50);
    const queue = buildCollectQueue([withLanding, blank], "tiki");
    expect(queue[0]?.clusterSlug).toBe("c");
    expect(queue[0]?.reason).toBe("has_landing");
    expect(queue[0]?.source).toBe("TIKI");
    expect(queue[0]?.savedLandingUrl).toContain("tiki.vn");
    const dashboard = buildPlatformDashboard({
      rows: [withLanding, blank],
      observations: [],
      tab: "tiki",
      nowMs: 1,
      titleBySlug: new Map([
        ["c", "Serum Tiki"],
        ["d", "Blank"],
      ]),
    });
    expect(dashboard.withDataCount).toBe(0);
    expect(dashboard.landingCount).toBe(1);
    expect(dashboard.missingCount).toBe(2);
    expect(dashboard.queue).toHaveLength(2);
  });
});
