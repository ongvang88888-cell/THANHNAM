import { describe, expect, it } from "vitest";
import { extractCopyPhrases, nameVariantQueries, snippetAround } from "./scan-phrases";

describe("scan phrases", () => {
  it("extracts product phrases from ad copy and drops price chatter", () => {
    const phrases = extractCopyPhrases("Kem chống nắng SPF50 — chỉ 249.000đ hôm nay. Inbox Zalo.");
    expect(phrases.some((q) => q.includes("kem chống nắng"))).toBe(true);
    expect(phrases.every((q) => !q.includes("249"))).toBe(true);
    expect(phrases.every((q) => !/000đ|590k|triệu/i.test(q))).toBe(true);
    expect(phrases.every((q) => !/\binbox\b/i.test(q))).toBe(true);
    const priced = extractCopyPhrases("Tiếng Anh giao tiếp buổi tối, học phí 1.490.000đ");
    expect(priced.some((q) => q.includes("tiếng anh") || q.includes("giao tiếp"))).toBe(true);
    expect(priced.every((q) => !/000đ|học phí/i.test(q))).toBe(true);
  });

  it("builds name variants for a running product title", () => {
    const variants = nameVariantQueries("Đèn LED cảm ứng tủ bếp");
    expect(variants[0]).toBe("Đèn LED cảm ứng tủ bếp");
    expect(variants.some((q) => q.toLowerCase().includes("đèn led"))).toBe(true);
    expect(variants.every((q) => q.toLowerCase().startsWith("đèn") || q === "Đèn LED cảm ứng tủ bếp")).toBe(
      true,
    );
    expect(variants.length).toBeGreaterThan(1);
    expect(variants.length).toBeLessThanOrEqual(6);
  });

  it("snips copy around the matched keyword", () => {
    const snip = snippetAround("Sale hôm nay. Đèn LED cảm ứng tủ bếp pin 3 tháng. Inbox.", "cảm ứng tủ bếp");
    expect(snip).toContain("cảm ứng tủ bếp");
    expect(snip.length).toBeLessThan(120);
  });
});
