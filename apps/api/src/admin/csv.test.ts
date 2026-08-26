import { describe, expect, it } from "vitest";
import {
  detectDelimiter,
  parseBoolean,
  parseCourseRows,
  parseCsv,
  parseLessonRows,
  parseVnd,
  serializeCsv,
  slugifyTitle,
} from "./csv";

describe("parseCsv", () => {
  it("reads quoted commas and newlines", () => {
    const csv = 'ten_khoa,mo_ta\n"Excel, Word","Dong 1\nDong 2"\n';
    const table = parseCsv(csv);
    expect(table.headers).toEqual(["ten_khoa", "mo_ta"]);
    expect(table.rows).toEqual([["Excel, Word", "Dong 1\nDong 2"]]);
  });

  it("unescapes doubled quotes", () => {
    const table = parseCsv('title\n"He said ""hi"""\n');
    expect(table.rows[0]?.[0]).toBe('He said "hi"');
  });

  it("detects semicolon Excel exports", () => {
    expect(detectDelimiter("ten_khoa;gia_vnd;email_giang_vien")).toBe(";");
    const table = parseCsv("ten_khoa;gia_vnd\nExcel;1000\n");
    expect(table.delimiter).toBe(";");
    expect(table.rows[0]).toEqual(["Excel", "1000"]);
  });

  it("rejects unbalanced quotes", () => {
    expect(() => parseCsv('title\n"oops\n')).toThrow(/ngoặc kép/);
  });

  it("rejects xlsx zip signatures", () => {
    expect(() => parseCsv("PK\u0003\u0004fake")).toThrow(/xlsx/);
  });
});

describe("parseVnd", () => {
  it("accepts plain and thousand-grouped amounts", () => {
    expect(parseVnd("1299000")).toEqual({ ok: true, value: 1299000 });
    expect(parseVnd("1.299.000")).toEqual({ ok: true, value: 1299000 });
    expect(parseVnd("1,299,000")).toEqual({ ok: true, value: 1299000 });
    expect(parseVnd("1299000,00")).toEqual({ ok: true, value: 1299000 });
    expect(parseVnd("")).toEqual({ ok: true, value: 0 });
  });

  it("rejects decimals and junk", () => {
    expect(parseVnd("12.99").ok).toBe(false);
    expect(parseVnd("abc").ok).toBe(false);
  });
});

describe("parseCourseRows", () => {
  it("maps Vietnamese headers and flags missing teacher", () => {
    const csv = serializeCsv([
      ["ten_khoa", "email_giang_vien", "gia_vnd", "xuat_ban"],
      ["Excel cơ bản", "", "1.299.000", "no"],
    ]);
    const { courses } = parseCourseRows(csv);
    expect(courses).toHaveLength(1);
    expect(courses[0]?.slug).toBe("excel-co-ban");
    expect(courses[0]?.slugAuto).toBe(true);
    expect(courses[0]?.priceVnd).toBe(1299000);
    expect(courses[0]?.errors.some((item) => item.includes("email giảng viên"))).toBe(true);
  });

  it("blocks duplicate slugs and Unica cover URLs", () => {
    const csv = serializeCsv([
      ["ten_khoa", "duong_dan", "email_giang_vien", "anh_bia"],
      ["A", "trung-slug", "teacher@edu.local", "https://unica.vn/cover.jpg"],
      ["B", "trung-slug", "teacher@edu.local", ""],
    ]);
    const { courses } = parseCourseRows(csv);
    expect(courses[0]?.errors.some((item) => item.includes("unica.vn"))).toBe(true);
    expect(courses[1]?.errors.some((item) => item.includes("trùng dòng"))).toBe(true);
  });

  it("parses yes/no publish and visibility aliases", () => {
    const csv = serializeCsv([
      ["title", "teacher_email", "publish", "visibility"],
      ["Khóa A", "a@edu.local", "có", "cong_khai"],
    ]);
    const { courses } = parseCourseRows(csv);
    expect(courses[0]?.publish).toBe(true);
    expect(courses[0]?.visibility).toBe("PUBLIC");
    expect(courses[0]?.errors).toEqual([]);
  });
});

describe("parseLessonRows", () => {
  it("auto-numbers sections and lessons", () => {
    const csv = serializeCsv([
      ["duong_dan_khoa", "chuong", "bai", "xem_truoc"],
      ["excel-tu-a-den-z", "Chương 1", "Bài 1", "yes"],
      ["excel-tu-a-den-z", "Chương 1", "Bài 2", "no"],
      ["excel-tu-a-den-z", "Chương 2", "Bài 1", "0"],
    ]);
    const { lessons } = parseLessonRows(csv);
    expect(lessons.map((item) => [item.sectionOrder, item.lessonOrder])).toEqual([
      [1, 1],
      [1, 2],
      [2, 1],
    ]);
    expect(lessons[0]?.preview).toBe(true);
  });

  it("rejects Unica lesson content", () => {
    const csv = serializeCsv([
      ["course_slug", "section", "lesson", "content"],
      ["khoa-a", "C1", "B1", "Xem https://unica.vn/khoa-hoc"],
    ]);
    const { lessons } = parseLessonRows(csv);
    expect(lessons[0]?.errors.some((item) => item.includes("unica.vn"))).toBe(true);
  });
});

describe("helpers", () => {
  it("slugifies Vietnamese titles", () => {
    expect(slugifyTitle("Excel từ A đến Z")).toBe("excel-tu-a-den-z");
  });

  it("parses boolean aliases", () => {
    expect(parseBoolean("Có")).toBe(true);
    expect(parseBoolean("không")).toBe(false);
    expect(parseBoolean("maybe")).toBeNull();
  });
});
