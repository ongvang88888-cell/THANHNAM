import { describe, expect, it } from "vitest";
import type { ClusterSignals } from "./ports";
import {
  adAgeDays,
  isNewInLastDays,
  scoreHeat,
  scoreIntensity,
  scoreLongevity,
  scoreSalesProxy,
  scoreVelocity,
} from "./scoring";

const empty: ClusterSignals = {
  activeAdCount: 0,
  distinctPageCount: 0,
  creativeVariantCount: 0,
  adsAgeDays: [],
  newAdsLast7Days: 0,
  salesProxySold: null,
};

describe("scoring", () => {
  it("returns zeros for empty signals", () => {
    const heat = scoreHeat(empty);
    expect(heat.intensity).toBe(0);
    expect(heat.longevity).toBe(0);
    expect(heat.velocity).toBe(0);
    expect(heat.salesProxy).toBe(0);
    expect(heat.heat).toBe(0);
    expect(heat.estimated).toBe(true);
  });

  it("rewards more pages and variants in intensity", () => {
    const low = scoreIntensity({ ...empty, activeAdCount: 1, distinctPageCount: 1, creativeVariantCount: 1 });
    const high = scoreIntensity({ ...empty, activeAdCount: 20, distinctPageCount: 5, creativeVariantCount: 12 });
    expect(high).toBeGreaterThan(low);
    expect(high).toBeLessThanOrEqual(100);
  });

  it("scores longevity buckets", () => {
    expect(scoreLongevity({ ...empty, adsAgeDays: [3] })).toBe(10);
    expect(scoreLongevity({ ...empty, adsAgeDays: [14] })).toBe(50);
    expect(scoreLongevity({ ...empty, adsAgeDays: [30] })).toBe(75);
    expect(scoreLongevity({ ...empty, adsAgeDays: [60] })).toBe(100);
    expect(scoreLongevity({ ...empty, adsAgeDays: [14, 60] })).toBe(75);
  });

  it("caps velocity at 10 new ads / week", () => {
    expect(scoreVelocity({ ...empty, newAdsLast7Days: 5 })).toBe(50);
    expect(scoreVelocity({ ...empty, newAdsLast7Days: 25 })).toBe(100);
  });

  it("treats missing sales proxy as zero, not unknown heat collapse", () => {
    const withSold = scoreHeat({ ...empty, activeAdCount: 8, distinctPageCount: 2, creativeVariantCount: 6, adsAgeDays: [40], salesProxySold: 4000 });
    const without = scoreHeat({ ...empty, activeAdCount: 8, distinctPageCount: 2, creativeVariantCount: 6, adsAgeDays: [40], salesProxySold: null });
    expect(without.salesProxy).toBe(0);
    expect(withSold.heat).toBeGreaterThan(without.heat);
    expect(scoreSalesProxy(-1)).toBe(0);
  });

  it("computes ad age from injected now", () => {
    const now = Date.parse("2026-08-27T00:00:00.000Z");
    expect(adAgeDays("2026-08-20", now)).toBe(7);
    expect(adAgeDays("2026-08-28", now)).toBe(0);
    expect(isNewInLastDays("2026-08-22", now, 7)).toBe(true);
    expect(isNewInLastDays("2026-08-01", now, 7)).toBe(false);
  });

  it("does not treat zero-weight mix as NaN", () => {
    const heat = scoreHeat(
      { ...empty, activeAdCount: 4, distinctPageCount: 1, creativeVariantCount: 2, adsAgeDays: [20] },
      { intensity: 0, longevity: 0, velocity: 0, salesProxy: 0 },
    );
    expect(heat.heat).toBe(0);
  });
});
