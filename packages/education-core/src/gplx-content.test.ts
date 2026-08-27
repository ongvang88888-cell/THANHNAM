import { describe, expect, it } from "vitest";
import {
  buildGplxSevenDayPlan,
  GPLX_SIGNS,
  GPLX_SITUATIONS,
  GPLX_TIPS,
  matchSignIllustration,
  matchSituationIllustration,
} from "./gplx-content";

describe("gplx content", () => {
  it("exposes tips, signs with images, and situations", () => {
    expect(GPLX_TIPS.length).toBeGreaterThan(5);
    expect(GPLX_SIGNS.length).toBeGreaterThan(150);
    expect(GPLX_SIGNS.every((s) => s.imageUrl.startsWith("/gplx/signs/"))).toBe(true);
    expect(GPLX_SITUATIONS.length).toBeGreaterThanOrEqual(20);
  });

  it("matches illustrations from stems", () => {
    expect(matchSignIllustration("Biển P.101 Đường cấm có ý nghĩa?")?.code).toBe("P.101");
    expect(matchSituationIllustration("Khi đèn đỏ bật, người lái phải?")?.id).toBe("sit-light");
  });

  it("builds a 7-day plan", () => {
    const plan = buildGplxSevenDayPlan("B");
    expect(plan).toHaveLength(7);
    expect(plan[0]?.day).toBe(1);
    expect(plan[6]?.actions.length).toBeGreaterThan(0);
  });
});
