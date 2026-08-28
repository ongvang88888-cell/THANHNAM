import { describe, expect, it } from "vitest";
import { parseAdLibrarySheet, parseCsvTable } from "./sheet-import";

describe("sheet import", () => {
  it("parses quoted CSV fields", () => {
    const table = parseCsvTable('a,b\n"1,2",ok\n');
    expect(table).toEqual([
      ["a", "b"],
      ["1,2", "ok"],
    ]);
  });

  it("maps v0 template columns and skips empty libraryId", () => {
    const csv = [
      "week,nicheSlug,libraryId,pageId,pageName,productTitle,startDate,isActive,platforms,listingPriceVnd,shopeeSold,notes",
      "2026-W34,my-pham,111000201,900201,LanHa Skin,Serum test,2026-08-01,true,facebook|instagram,189000,12,ghi chú",
      "2026-W34,my-pham,,900202,Skip Page,Bỏ dòng,2026-08-01,true,facebook,,,",
    ].join("\n");
    const parsed = parseAdLibrarySheet(csv);
    expect(parsed.skipped).toBe(1);
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0]).toMatchObject({
      libraryId: "111000201",
      pageId: "900201",
      pageName: "LanHa Skin",
      productTitle: "Serum test",
      startDate: "2026-08-01",
      nicheSlug: "my-pham",
      isActive: true,
      platforms: ["facebook", "instagram"],
      listingPriceVnd: "189000",
      shopeeSold: 12,
      body: "ghi chú",
    });
  });

  it("maps extra channel metric columns", () => {
    const csv = [
      "libraryId,pageId,pageName,productTitle,startDate,lazadaSold,googleAdsSeen,youtubeViews",
      "111000202,900202,Lazada Shop,Serum extra,2026-08-01,40,3,9000",
    ].join("\n");
    const parsed = parseAdLibrarySheet(csv);
    expect(parsed.rows[0]).toMatchObject({
      lazadaSold: 40,
      googleAdsSeen: 3,
      youtubeViews: 9000,
    });
  });

  it("rejects unknown niche slugs", () => {
    const csv = [
      "libraryId,pageId,pageName,productTitle,startDate,nicheSlug",
      "1,2,Page,Serum,2026-08-01,not-a-niche",
    ].join("\n");
    const parsed = parseAdLibrarySheet(csv);
    expect(parsed.rows).toHaveLength(0);
    expect(parsed.errors[0]).toContain("nicheSlug");
  });

  it("requires header columns", () => {
    const parsed = parseAdLibrarySheet("foo,bar\n1,2");
    expect(parsed.rows).toHaveLength(0);
    expect(parsed.errors[0]).toContain("Thiếu cột bắt buộc");
  });
});
