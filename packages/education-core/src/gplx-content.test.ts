import { describe, expect, it } from "vitest";
import { buildGplxSevenDayPlan, GPLX_SIGNS, GPLX_TIPS } from "./gplx-content";

describe("gplx content", () => {
  it("exposes tips and signs", () => {
    expect(GPLX_TIPS.length).toBeGreaterThan(5);
    expect(GPLX_SIGNS.length).toBeGreaterThan(10);
  });

  it("builds a 7-day plan", () => {
    const plan = buildGplxSevenDayPlan("B");
    expect(plan).toHaveLength(7);
    expect(plan[0]?.day).toBe(1);
    expect(plan[6]?.actions.length).toBeGreaterThan(0);
  });
});
