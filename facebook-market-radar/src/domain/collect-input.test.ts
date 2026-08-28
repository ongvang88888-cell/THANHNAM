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
      expect(result.observations).toEqual([{ source: "SHOPEE", value: 4200 }]);
      expect(result.imageUrl).toBeNull();
    }
  });

  it("accepts a product image URL and rejects javascript", () => {
    const ok = validateCollectManual({
      libraryId: "1",
      pageId: "2",
      pageName: "Page",
      productTitle: "Serum",
      startDate: "2026-08-01",
      imageUrl: "https://cdn.example.com/serum.jpg",
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.imageUrl).toBe("https://cdn.example.com/serum.jpg");
    }
    const bad = validateCollectManual({
      libraryId: "1",
      pageId: "2",
      pageName: "Page",
      productTitle: "Serum",
      startDate: "2026-08-01",
      imageUrl: "javascript:alert(1)",
    });
    expect(bad.ok).toBe(false);
    const badLanding = validateCollectManual({
      libraryId: "1",
      pageId: "2",
      pageName: "Page",
      productTitle: "Serum",
      startDate: "2026-08-01",
      landingUrl: "javascript:alert(1)",
    });
    expect(badLanding.ok).toBe(false);
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

  it("drops javascript landing inside a snapshot", () => {
    const result = validateCollectManual({
      snapshot: {
        libraryId: "99",
        pageId: "12",
        pageName: "Demo Page",
        startDate: "2026-08-01",
        productTitle: "Đèn LED",
        landingUrl: "javascript:alert(1)",
      },
      productTitle: "Đèn LED cảm ứng tủ bếp",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.ad.landingUrl).toBeNull();
    }
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

  it("accepts a listing price and snapshot price", () => {
    const typed = validateCollectManual({
      libraryId: "1",
      pageId: "2",
      pageName: "Page",
      productTitle: "Serum",
      startDate: "2026-08-01",
      listingPriceVnd: "189.000đ",
    });
    expect(typed.ok).toBe(true);
    if (typed.ok) {
      expect(typed.listingPriceVnd).toBe(189_000);
    }
    const fromSnap = validateCollectManual({
      snapshot: {
        libraryId: "99",
        pageId: "12",
        pageName: "Demo Page",
        startDate: "2026-08-01",
        productTitle: "Đèn LED",
        listingPriceVnd: 79_000,
      },
      productTitle: "Đèn LED cảm ứng tủ bếp",
    });
    expect(fromSnap.ok).toBe(true);
    if (fromSnap.ok) {
      expect(fromSnap.listingPriceVnd).toBe(79_000);
    }
    const bad = validateCollectManual({
      libraryId: "1",
      pageId: "2",
      pageName: "Page",
      productTitle: "Serum",
      startDate: "2026-08-01",
      listingPriceVnd: 12,
    });
    expect(bad.ok).toBe(false);
  });

  it("collects ecom sold and YouTube views without mixing kinds", () => {
    const result = validateCollectManual({
      libraryId: "1",
      pageId: "2",
      pageName: "Page",
      productTitle: "Serum",
      startDate: "2026-08-01",
      lazadaSold: 80,
      youtubeViews: 12_000,
      googleAdsSeen: 3,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.observations).toEqual([
        { source: "LAZADA", value: 80 },
        { source: "GOOGLE_ADS", value: 3 },
        { source: "YOUTUBE_VIEWS", value: 12_000 },
      ]);
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
