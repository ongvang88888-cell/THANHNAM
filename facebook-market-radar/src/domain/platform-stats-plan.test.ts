import { describe, expect, it } from "vitest";
import { buildChannelAnalysisRow } from "./channel-analysis";
import type { PriceEstimate } from "./price";
import { pickClustersForYoutubeSearch, pickListingSearchJobs } from "./platform-stats-plan";
import type { RankingRow } from "./weekly-report";

const PRICE: PriceEstimate = {
  lowVnd: 1,
  highVnd: 2,
  midVnd: 1,
  confidence: "thap",
  sources: ["catalog"],
  label: "1",
  note: "t",
};

function row(slug: string, title: string, landings: string[], views: number | null, heat = 10) {
  return buildChannelAnalysisRow(
    {
      clusterSlug: slug,
      clusterTitle: title,
      nicheSlug: "my-pham",
      nicheName: "Mỹ phẩm",
      activeAdCount: 2,
      totalAdCount: 2,
      distinctPageCount: 1,
      imageUrls: [],
      price: PRICE,
      scores: { intensity: 10, longevity: 10, velocity: 5, salesProxy: 0, heat, estimated: true },
    } as RankingRow,
    views === null ? [] : [{ clusterSlug: slug, source: "YOUTUBE_VIEWS", value: views, observedMs: 1 }],
    landings,
  );
}

describe("platform stats job picker", () => {
  it("searches YouTube only for clusters missing views", () => {
    const jobs = pickClustersForYoutubeSearch(
      [row("a", "Serum A", [], 100, 1), row("b", "Serum B", [], null, 80)],
      4,
    );
    expect(jobs.map((job) => job.clusterSlug)).toEqual(["b"]);
  });

  it("asks CSE for marketplaces that still lack a landing", () => {
    const jobs = pickListingSearchJobs(
      [row("x", "Serum X", ["https://shopee.vn/item"], null, 50)],
      8,
    );
    expect(jobs.some((job) => job.site === "shopee")).toBe(false);
    expect(jobs.some((job) => job.site === "tiki" && job.clusterSlug === "x")).toBe(true);
  });
});
