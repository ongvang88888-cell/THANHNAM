import { describe, expect, it } from "vitest";
import { buildClusterSignals, maxSold } from "./signals";

describe("signals", () => {
  it("builds cluster signals from ads + now", () => {
    const now = Date.parse("2026-08-27T00:00:00.000Z");
    const signals = buildClusterSignals(
      [
        { isActive: true, pageId: "1", creativeHash: "a", startDate: "2026-05-20" },
        { isActive: true, pageId: "2", creativeHash: "b", startDate: "2026-08-25" },
        { isActive: false, pageId: "1", creativeHash: "c", startDate: "2026-04-10" },
      ],
      now,
      2100,
    );
    expect(signals.activeAdCount).toBe(2);
    expect(signals.distinctPageCount).toBe(2);
    expect(signals.creativeVariantCount).toBe(2);
    expect(signals.newAdsLast7Days).toBe(1);
    expect(signals.salesProxySold).toBe(2100);
  });

  it("takes max sold across observations", () => {
    expect(maxSold([null, 10, 40, null])).toBe(40);
    expect(maxSold([null, null])).toBeNull();
  });
});
