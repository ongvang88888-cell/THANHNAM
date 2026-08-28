import { describe, expect, it } from "vitest";
import { catalogPriceBand, estimateProductPrice, formatVnd, parseOptionalPriceVnd, parseVndAmounts } from "./price";

describe("price", () => {
  it("parses common Vietnamese price writings", () => {
    expect(parseVndAmounts("Serum 189.000đ")).toEqual([189_000]);
    expect(parseVndAmounts("Giá 189k hôm nay")).toEqual([189_000]);
    expect(parseVndAmounts("1.2 triệu / khóa")).toEqual([1_200_000]);
    expect(parseVndAmounts("299000 vnđ")).toEqual([299_000]);
  });

  it("does not treat volume or year as price", () => {
    expect(parseVndAmounts("Serum 30ml 10% 2026")).toEqual([]);
    expect(parseVndAmounts("Bỉm 76 miếng")).toEqual([]);
  });

  it("accepts a listing price and rejects junk", () => {
    expect(parseOptionalPriceVnd(189_000)).toBe(189_000);
    expect(parseOptionalPriceVnd("249.000đ")).toBe(249_000);
    expect(parseOptionalPriceVnd("99000")).toBe(99_000);
    expect(() => parseOptionalPriceVnd(12)).toThrow(/VND/);
  });

  it("prefers user listing over catalog", () => {
    const estimate = estimateProductPrice({
      title: "Serum Niacinamide 10% 30ml",
      nicheSlug: "my-pham",
      listingPricesVnd: [189_000],
      copyTexts: ["Serum Niacinamide 10% 30ml"],
    });
    expect(estimate.midVnd).toBe(189_000);
    expect(estimate.confidence).toBe("cao");
    expect(estimate.label).toContain("189.000đ");
    expect(estimate.sources).toContain("user");
  });

  it("reads copy then falls back to catalog band", () => {
    const fromCopy = estimateProductPrice({
      title: "Kem chống nắng SPF50",
      nicheSlug: "my-pham",
      copyTexts: ["Chỉ 249.000đ hôm nay"],
    });
    expect(fromCopy.midVnd).toBe(249_000);
    expect(fromCopy.confidence).toBe("vua");
    const catalog = estimateProductPrice({
      title: "Serum Niacinamide 10%",
      nicheSlug: "my-pham",
    });
    expect(catalog.confidence).toBe("thap");
    expect(catalog.lowVnd).toBeLessThan(catalog.highVnd);
    expect(catalogPriceBand("Bỉm quần size M", "me-be").lowVnd).toBe(180_000);
  });

  it("formats VND with dots", () => {
    expect(formatVnd(1_200_000)).toBe("1.200.000đ");
  });
});
