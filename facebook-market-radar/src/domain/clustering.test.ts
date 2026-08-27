import { describe, expect, it } from "vitest";
import { draftCluster, guessNiche, shouldMergeClusters, slugifyTitle } from "./clustering";

describe("clustering", () => {
  it("guesses niche from Vietnamese keywords", () => {
    expect(guessNiche("Serum Niacinamide 10%", null)).toBe("my-pham");
    expect(guessNiche("Bỉm quần size M", null)).toBe("me-be");
    expect(guessNiche("Collagen peptide 5000mg", null)).toBe("tpcn");
    expect(guessNiche("Khóa Excel cho nhân sự", null)).toBe("khoa-hoc");
    expect(guessNiche("Đèn LED cảm ứng", null)).toBe("gadget");
    expect(guessNiche("Ốp lưng iPhone 16", null)).toBe("dien-tu");
    expect(guessNiche("Đầm dự tiệc body", null)).toBe("thoi-trang-nu");
    expect(guessNiche("Sản phẩm hoàn toàn lạ xyz", null)).toBe("khac");
  });

  it("honors niche hint when valid", () => {
    expect(guessNiche("Sản phẩm lạ", "tpcn")).toBe("tpcn");
  });

  it("merges near-duplicate titles", () => {
    expect(shouldMergeClusters("Đèn LED cảm ứng tủ bếp", "Đèn LED cảm ứng tủ bếp 2026")).toBe(true);
    expect(shouldMergeClusters("Serum Niacinamide", "Khóa Excel nhân sự")).toBe(false);
  });

  it("slugifies Vietnamese titles", () => {
    expect(slugifyTitle("Serum Niacinamide 10% 30ml")).toContain("serum-niacinamide");
    const draft = draftCluster("Máy hút sữa không dây", "me-be");
    expect(draft.nicheSlug).toBe("me-be");
    expect(draft.slug.length).toBeGreaterThan(3);
  });
});
