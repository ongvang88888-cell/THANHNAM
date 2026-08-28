import { describe, expect, it } from "vitest";
import { LOCKED_NICHES } from "./niches";
import {
  catalogNicheCounts,
  filterBestsellerCatalog,
  listBestsellerCatalog,
  PLATFORM_BESTSELLER_TARGET,
  resetBestsellerCatalogCache,
} from "./bestseller-catalog";

describe("bestseller research catalog", () => {
  it("builds 999 unique research titles across locked niches", () => {
    resetBestsellerCatalogCache();
    const rows = listBestsellerCatalog();
    expect(rows).toHaveLength(PLATFORM_BESTSELLER_TARGET);
    expect(new Set(rows.map((row) => row.title.toLowerCase())).size).toBe(999);
    expect(new Set(rows.map((row) => row.id)).size).toBe(999);
    expect(rows.every((row) => row.nationalDump === false)).toBe(true);
    const counts = catalogNicheCounts();
    expect(Object.keys(counts).length).toBe(LOCKED_NICHES.length);
    for (const niche of LOCKED_NICHES) {
      expect(counts[niche.slug] ?? 0).toBeGreaterThan(0);
    }
  });

  it("filters by niche and query without inventing sold counts", () => {
    const meBe = filterBestsellerCatalog("me-be");
    expect(meBe.length).toBeGreaterThan(0);
    expect(meBe.every((row) => row.nicheSlug === "me-be")).toBe(true);
    const bim = filterBestsellerCatalog(undefined, "bỉm quần");
    expect(bim.some((row) => /bỉm/i.test(row.title))).toBe(true);
    expect(bim.every((row) => !("soldTotal" in row))).toBe(true);
  });
});
