import { describe, expect, it } from "vitest";
import { adRunSummary, analyzeProductName, intensityFromCounts, nameMatchScore } from "./product-watch";

describe("product watch", () => {
  it("matches near-duplicate product names", () => {
    expect(nameMatchScore("Serum Niacinamide", "Serum Niacinamide 10% 30ml")).toBeGreaterThan(0.8);
    expect(nameMatchScore("Serum Niacinamide", "Khóa Excel nhân sự")).toBeLessThan(0.2);
  });

  it("labels ad intensity from counts", () => {
    expect(intensityFromCounts(0, 0).intensity).toBe("chua-co");
    expect(intensityFromCounts(1, 1).intensity).toBe("it");
    expect(intensityFromCounts(2, 1).intensity).toBe("vua");
    expect(intensityFromCounts(4, 2).intensity).toBe("nhieu");
  });

  it("counts running ads for a recorded product name", () => {
    const analysis = analyzeProductName("Serum Niacinamide", [
      {
        slug: "serum-nia",
        title: "Serum Niacinamide 10% 30ml",
        nicheSlug: "my-pham",
        ads: [
          { isActive: true, pageId: "1", listingPriceVnd: 189_000, body: "189.000đ" },
          { isActive: true, pageId: "2", listingPriceVnd: 199_000, body: null },
          { isActive: false, pageId: "1", listingPriceVnd: null, body: null },
        ],
      },
      {
        slug: "den-led",
        title: "Đèn LED cảm ứng tủ bếp",
        nicheSlug: "gadget",
        ads: [{ isActive: true, pageId: "9", listingPriceVnd: 79_000, body: null }],
      },
    ]);
    expect(analysis.clusterCount).toBe(1);
    expect(analysis.activeAdCount).toBe(2);
    expect(analysis.totalAdCount).toBe(3);
    expect(analysis.distinctPageCount).toBe(2);
    expect(analysis.intensity).toBe("vua");
    expect(analysis.price?.midVnd).toBeGreaterThan(0);
  });

  it("summarizes running ads beside the product name", () => {
    expect(adRunSummary(2, 2, 3)).toBe("2 bài đang chạy / 2 trang · 3 bài đã lưu");
    expect(adRunSummary(2, 2, 2)).toBe("2 bài đang chạy / 2 trang");
  });
});
