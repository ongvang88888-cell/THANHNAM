import { describe, expect, it } from "vitest";
import { buildIndustryStats, catalogCoverage, isStrongProduct } from "./industry-stats";
import type { PriceEstimate } from "./price";
import type { RankingRow } from "./weekly-report";

const TEST_PRICE: PriceEstimate = {
  lowVnd: 100_000,
  highVnd: 200_000,
  midVnd: 150_000,
  confidence: "thap",
  sources: ["catalog"],
  label: "≈ 150.000đ",
  note: "test",
};

function row(partial: Partial<RankingRow> & Pick<RankingRow, "nicheSlug" | "clusterSlug">): RankingRow {
  return {
    clusterTitle: partial.clusterTitle ?? partial.clusterSlug,
    nicheName: partial.nicheName ?? partial.nicheSlug,
    activeAdCount: partial.activeAdCount ?? 1,
    totalAdCount: partial.totalAdCount ?? partial.activeAdCount ?? 1,
    distinctPageCount: partial.distinctPageCount ?? 1,
    imageUrls: partial.imageUrls ?? [],
    price: partial.price ?? TEST_PRICE,
    scores: partial.scores ?? {
      intensity: 20,
      longevity: 20,
      velocity: 10,
      salesProxy: 0,
      heat: 18,
      estimated: true,
    },
    ...partial,
  };
}

describe("industry stats", () => {
  it("marks a product strong by heat or durable ads", () => {
    expect(
      isStrongProduct(
        row({
          nicheSlug: "my-pham",
          clusterSlug: "serum",
          scores: { intensity: 50, longevity: 20, velocity: 10, salesProxy: 10, heat: 42, estimated: true },
        }),
      ),
    ).toBe(true);
    expect(
      isStrongProduct(
        row({
          nicheSlug: "gadget",
          clusterSlug: "den",
          activeAdCount: 2,
          scores: { intensity: 20, longevity: 70, velocity: 5, salesProxy: 10, heat: 28, estimated: true },
        }),
      ),
    ).toBe(true);
    expect(isStrongProduct(row({ nicheSlug: "khac", clusterSlug: "linh-tinh" }))).toBe(false);
  });

  it("covers the full catalog and flags hot industries", () => {
    const stats = buildIndustryStats([
      row({
        nicheSlug: "my-pham",
        clusterSlug: "serum",
        nicheName: "Mỹ phẩm / chăm sóc da",
        activeAdCount: 3,
        distinctPageCount: 2,
        scores: { intensity: 60, longevity: 70, velocity: 20, salesProxy: 40, heat: 55, estimated: true },
      }),
      row({
        nicheSlug: "gadget",
        clusterSlug: "den",
        nicheName: "Thiết bị nhà thông minh",
        activeAdCount: 1,
        scores: { intensity: 10, longevity: 10, velocity: 5, salesProxy: 0, heat: 8, estimated: true },
      }),
    ]);
    expect(stats).toHaveLength(26);
    const beauty = stats.find((s) => s.nicheSlug === "my-pham");
    expect(beauty?.isHot).toBe(true);
    expect(beauty?.hasData).toBe(true);
    expect(beauty?.strongProductCount).toBe(1);
    const empty = stats.find((s) => s.nicheSlug === "nong-san");
    expect(empty?.hasData).toBe(false);
    const coverage = catalogCoverage(stats);
    expect(coverage.totalNiches).toBe(26);
    expect(coverage.nichesWithData).toBe(2);
    expect(coverage.hotIndustryCount).toBe(1);
    expect(coverage.searchKeywordCount).toBeGreaterThan(40);
  });
});
