import { describe, expect, it } from "vitest";
import type { PriceEstimate } from "./price";
import {
  STRONG_FIND_METHODS,
  STRONG_HEAT,
  STRONG_LOOK_FOR,
  compareStrongProducts,
  rankStrongProducts,
  strongProductReason,
} from "./strong-ads";
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

function row(partial: Partial<RankingRow> & Pick<RankingRow, "clusterSlug">): RankingRow {
  return {
    clusterTitle: partial.clusterTitle ?? partial.clusterSlug,
    nicheSlug: partial.nicheSlug ?? "gadget",
    nicheName: partial.nicheName ?? "Gadget",
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

describe("strong ads finder", () => {
  it("lists three legal methods and never recommends scraping Facebook", () => {
    expect(STRONG_FIND_METHODS.map((m) => m.id)).toEqual([
      "ad_library_manual",
      "radar_warehouse",
      "licensed_feed",
    ]);
    const blob = JSON.stringify(STRONG_FIND_METHODS).toLowerCase();
    expect(blob).not.toContain("scrape");
    expect(blob).not.toContain("crawl");
    expect(STRONG_FIND_METHODS.every((m) => m.limitVi.length > 20)).toBe(true);
  });

  it("maps Ad Library look-fors onto heat signals", () => {
    expect(STRONG_LOOK_FOR.map((item) => item.id)).toEqual([
      "active_old_start",
      "many_pages",
      "many_creatives",
      "new_burst",
    ]);
    expect(STRONG_LOOK_FOR.find((item) => item.id === "active_old_start")?.mapsTo).toBe("longevity");
    expect(STRONG_LOOK_FOR.filter((item) => item.mapsTo === "intensity")).toHaveLength(2);
    expect(STRONG_LOOK_FOR.find((item) => item.id === "new_burst")?.mapsTo).toBe("velocity");
  });

  it("ranks only strong products by heat then longevity then ad/page counts", () => {
    const weak = row({ clusterSlug: "linh-tinh", scores: { intensity: 10, longevity: 10, velocity: 5, salesProxy: 0, heat: 12, estimated: true } });
    const byLongevity = row({
      clusterSlug: "den",
      clusterTitle: "Đèn",
      activeAdCount: 2,
      distinctPageCount: 1,
      scores: { intensity: 20, longevity: 80, velocity: 5, salesProxy: 0, heat: 28, estimated: true },
    });
    const hotter = row({
      clusterSlug: "serum",
      clusterTitle: "Serum",
      activeAdCount: 3,
      distinctPageCount: 2,
      scores: { intensity: 60, longevity: 40, velocity: 20, salesProxy: 10, heat: 55, estimated: true },
    });
    const sameHeatMorePages = row({
      clusterSlug: "serum-b",
      clusterTitle: "Serum B",
      activeAdCount: 3,
      distinctPageCount: 4,
      scores: { intensity: 60, longevity: 40, velocity: 20, salesProxy: 10, heat: 55, estimated: true },
    });
    const ranked = rankStrongProducts([weak, byLongevity, hotter, sameHeatMorePages]);
    expect(ranked.map((item) => item.clusterSlug)).toEqual(["serum-b", "serum", "den"]);
    expect(compareStrongProducts(hotter, byLongevity)).toBeLessThan(0);
  });

  it("explains heat vs durable-ad reasons", () => {
    const heatOnly = row({
      clusterSlug: "hot",
      scores: { intensity: 70, longevity: 10, velocity: 20, salesProxy: 0, heat: STRONG_HEAT, estimated: true },
    });
    const durable = row({
      clusterSlug: "ben",
      activeAdCount: 2,
      scores: { intensity: 20, longevity: 50, velocity: 5, salesProxy: 0, heat: 22, estimated: true },
    });
    expect(strongProductReason(heatOnly)).toMatchObject({ byHeat: true, byLongevity: false });
    expect(strongProductReason(heatOnly).labelVi).toContain(`≥ ${STRONG_HEAT}`);
    expect(strongProductReason(durable)).toMatchObject({ byHeat: false, byLongevity: true });
    expect(strongProductReason(weakReasonRow()).labelVi).toBe("chưa đạt ngưỡng mạnh");
  });
});

function weakReasonRow(): RankingRow {
  return row({ clusterSlug: "yeu" });
}
