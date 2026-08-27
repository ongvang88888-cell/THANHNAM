import { describe, expect, it } from "vitest";
import { validateCollectManual } from "./collect-input";

describe("validateCollectManual", () => {
  it("accepts a complete manual row", () => {
    const result = validateCollectManual({
      sourceUrl: "https://www.facebook.com/ads/library/?id=111000001&country=VN",
      pageId: "900001",
      pageName: "LanHa Skin Lab",
      productTitle: "Serum Niacinamide 10% 30ml",
      startDate: "2026-06-20",
      nicheSlug: "my-pham",
      shopeeSold: 4200,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.ad.libraryId).toBe("111000001");
      expect(result.shopeeSold).toBe(4200);
    }
  });

  it("requires libraryId when URL is only a keyword search", () => {
    const result = validateCollectManual({
      sourceUrl: "https://www.facebook.com/ads/library/?country=VN&q=serum",
      pageId: "1",
      pageName: "X",
      productTitle: "Serum",
      startDate: "2026-08-01",
    });
    expect(result.ok).toBe(false);
  });

  it("parses snapshot JSON", () => {
    const result = validateCollectManual({
      snapshot: {
        libraryId: "99",
        pageId: "12",
        pageName: "Demo Page",
        startDate: "2026-08-01",
        productTitle: "Đèn LED",
      },
      productTitle: "Đèn LED cảm ứng tủ bếp",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.ad.pageName).toBe("Demo Page");
      expect(result.productTitle).toBe("Đèn LED cảm ứng tủ bếp");
    }
  });

  it("rejects negative sold counts", () => {
    const result = validateCollectManual({
      libraryId: "1",
      pageId: "2",
      pageName: "Page",
      productTitle: "SP",
      startDate: "2026-08-01",
      shopeeSold: -3,
    });
    expect(result.ok).toBe(false);
  });
});
