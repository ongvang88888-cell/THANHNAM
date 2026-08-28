import { describe, expect, it } from "vitest";
import { buildChannelAnalysisRow, heatEligibleSold, sortChannelAnalysis } from "./channel-analysis";
import type { PriceEstimate } from "./price";
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

describe("channel analysis", () => {
  it("sums ecom sold peaks and does not treat YouTube views as sales", () => {
    const row = buildChannelAnalysisRow(
      ranking({ clusterSlug: "den", clusterTitle: "Đèn LED" }),
      [
        { clusterSlug: "den", source: "SHOPEE", value: 1000, observedMs: 1 },
        { clusterSlug: "den", source: "SHOPEE", value: 800, observedMs: 2 },
        { clusterSlug: "den", source: "LAZADA", value: 200, observedMs: 1 },
        { clusterSlug: "den", source: "YOUTUBE_VIEWS", value: 90_000, observedMs: 1 },
      ],
      ["https://shopee.vn/shop-den/p"],
      { platforms: ["facebook", "instagram"], lastSeenMs: 9 },
    );
    expect(row.sold.shopee).toBe(1000);
    expect(row.sold.lazada).toBe(200);
    expect(row.soldTotal).toBe(1200);
    expect(row.youtubeViews).toBe(90_000);
    expect(row.estimated).toBe(true);
    expect(row.facebookNationalDump).toBe(false);
    expect(row.landingKinds).toEqual(["shopee"]);
    expect(row.platforms).toEqual(["facebook", "instagram"]);
    expect(row.lastObservedMs).toBe(2);
    expect(row.observationCount).toBe(4);
    expect(row.links.googleAds).toContain("adstransparency.google.com");
    expect(heatEligibleSold([{ clusterSlug: "den", source: "YOUTUBE_VIEWS", value: 90_000, observedMs: 1 }])).toBeNull();
    expect(
      heatEligibleSold([
        { clusterSlug: "den", source: "SHOPEE", value: 10, observedMs: 1 },
        { clusterSlug: "den", source: "YOUTUBE_VIEWS", value: 90_000, observedMs: 1 },
      ]),
    ).toBe(10);
  });

  it("sorts by ads, sold, and composite without claiming a national dump", () => {
    const adsHeavy = buildChannelAnalysisRow(
      ranking({ clusterSlug: "a", clusterTitle: "A", activeAdCount: 8, scores: { intensity: 80, longevity: 20, velocity: 10, salesProxy: 0, heat: 40, estimated: true } }),
      [],
      [],
    );
    const soldHeavy = buildChannelAnalysisRow(
      ranking({ clusterSlug: "b", clusterTitle: "B", activeAdCount: 1, scores: { intensity: 10, longevity: 20, velocity: 5, salesProxy: 80, heat: 20, estimated: true } }),
      [{ clusterSlug: "b", source: "SHOPEE", value: 20_000, observedMs: 1 }],
      [],
    );
    expect(sortChannelAnalysis([soldHeavy, adsHeavy], "ads")[0]?.clusterSlug).toBe("a");
    expect(sortChannelAnalysis([adsHeavy, soldHeavy], "sold")[0]?.clusterSlug).toBe("b");
    expect(sortChannelAnalysis([adsHeavy, soldHeavy], "tong").every((row) => row.estimated)).toBe(true);
  });
});
