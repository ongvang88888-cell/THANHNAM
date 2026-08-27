import { describe, expect, it } from "vitest";
import { isoWeekLabel, parseIsoWeekLabel, weekStartUtc } from "./week";

describe("week", () => {
  it("uses Monday UTC as week start", () => {
    const thursday = Date.parse("2026-08-27T15:00:00.000Z");
    const start = weekStartUtc(thursday);
    expect(start.toISOString()).toBe("2026-08-24T00:00:00.000Z");
    expect(isoWeekLabel(thursday)).toBe("2026-W35");
  });

  it("parses ISO week labels", () => {
    const start = parseIsoWeekLabel("2026-W35");
    expect(start?.toISOString()).toBe("2026-08-24T00:00:00.000Z");
    expect(parseIsoWeekLabel("nope")).toBeNull();
    expect(parseIsoWeekLabel("2026-W99")).toBeNull();
  });
});
