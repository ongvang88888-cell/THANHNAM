import { describe, expect, it } from "vitest";
import { isUsefulScanQuery } from "./ad-library-scan";
import { megaScanCount, megaScanCountsByNiche, pageMegaScan } from "./mega-scan";

describe("mega scan catalog", () => {
  it("mints about a million official VN Ad Library queries without fetching Facebook", () => {
    const total = megaScanCount();
    expect(total).toBeGreaterThanOrEqual(900_000);
    expect(total).toBeLessThanOrEqual(1_000_000);
    const first = pageMegaScan({ offset: 0, limit: 40 });
    expect(first.officialSearchOnly).toBe(true);
    expect(first.notAFacebookDump).toBe(true);
    expect(first.page).toHaveLength(40);
    expect(first.total).toBe(total);
    expect(first.hasMore).toBe(true);
    expect(first.page.every((row) => isUsefulScanQuery(row.query))).toBe(true);
    expect(first.page.every((row) => row.libraryUrl.includes("country=VN"))).toBe(true);
    expect(first.page.every((row) => row.libraryUrl.includes("active_status=active"))).toBe(true);
    const second = pageMegaScan({ offset: 40, limit: 40 });
    const ids = new Set(first.page.map((row) => row.id));
    expect(second.page.every((row) => !ids.has(row.id))).toBe(true);
    const again = pageMegaScan({ offset: 0, limit: 40 });
    expect(again.page[0]?.query).toBe(first.page[0]?.query);
  }, 20_000);

  it("filters the mega queue by niche and product substring", () => {
    const gadget = pageMegaScan({ nicheSlug: "gadget", limit: 20, q: "đèn led" });
    expect(gadget.total).toBeGreaterThan(20);
    expect(gadget.page.every((row) => row.nicheSlug === "gadget")).toBe(true);
    expect(gadget.page.every((row) => row.query.toLowerCase().includes("đèn") || row.query.toLowerCase().includes("led"))).toBe(
      true,
    );
    const byNiche = megaScanCountsByNiche();
    expect(byNiche.some((row) => row.nicheSlug === "my-pham" && row.count > 10_000)).toBe(true);
  }, 20_000);
});
