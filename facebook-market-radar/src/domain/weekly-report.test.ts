import { describe, expect, it } from "vitest";
import { buildWeeklyReportMarkdown } from "./weekly-report";

describe("weekly report", () => {
  it("renders estimated ranking table", () => {
    const md = buildWeeklyReportMarkdown({
      nowMs: Date.parse("2026-08-27T00:00:00.000Z"),
      adCount: 25,
      pageCount: 18,
      clusterCount: 16,
      rankings: [
        {
          clusterSlug: "den-led",
          clusterTitle: "Đèn LED cảm ứng tủ bếp",
          nicheSlug: "gadget",
          nicheName: "Gadget / nhà cửa",
          activeAdCount: 2,
          totalAdCount: 2,
          distinctPageCount: 2,
          imageUrls: ["/api/anh-san-pham?ten=Den"],
          price: {
            lowVnd: 79_000,
            highVnd: 99_000,
            midVnd: 89_000,
            confidence: "vua",
            sources: ["copy", "catalog"],
            label: "≈ 89.000đ",
            note: "test",
          },
          scores: {
            intensity: 40,
            longevity: 80,
            velocity: 10,
            salesProxy: 70,
            heat: 52.5,
            estimated: true,
          },
        },
      ],
    });
    expect(md).toContain("2026-W35");
    expect(md).toContain("Đèn LED cảm ứng tủ bếp");
    expect(md).toContain("Không phải");
    expect(md).toContain("52.5");
    expect(md).toContain("≈ 89.000đ");
    expect(md).toContain("Giá (ước lượng)");
  });
});
