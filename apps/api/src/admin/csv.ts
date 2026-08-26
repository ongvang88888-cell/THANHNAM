export const MAX_IMPORT_CHARS = 1_500_000;
export const MAX_COURSE_ROWS = 200;
export const MAX_LESSON_ROWS = 2000;

export const COURSE_FIELD_ALIASES: Record<string, CourseField> = {
  title: "title",
  ten: "title",
  ten_khoa: "title",
  ten_khoa_hoc: "title",
  name: "title",
  slug: "slug",
  duong_dan: "slug",
  duong_dan_khoa: "slug",
  description: "description",
  mo_ta: "description",
  pricevnd: "priceVnd",
  price_vnd: "priceVnd",
  gia: "priceVnd",
  gia_vnd: "priceVnd",
  price: "priceVnd",
  compare_at_vnd: "compareAtVnd",
  compareatvnd: "compareAtVnd",
  gia_goc: "compareAtVnd",
  gia_goc_vnd: "compareAtVnd",
  teacher_email: "teacherEmail",
  email_giang_vien: "teacherEmail",
  giang_vien: "teacherEmail",
  email: "teacherEmail",
  publish: "publish",
  xuat_ban: "publish",
  published: "publish",
  visibility: "visibility",
  hien_thi: "visibility",
  category_slug: "categorySlug",
  danh_muc: "categorySlug",
  category: "categorySlug",
  cover_url: "coverUrl",
  anh_bia: "coverUrl",
  thumbnail: "coverUrl",
  thumbnail_url: "coverUrl",
  level: "level",
  cap_do: "level",
  language: "language",
  ngon_ngu: "language",
};

export const LESSON_FIELD_ALIASES: Record<string, LessonField> = {
  course_slug: "courseSlug",
  duong_dan_khoa: "courseSlug",
  slug_khoa: "courseSlug",
  khoa: "courseSlug",
  section: "section",
  chuong: "section",
  ten_chuong: "section",
  section_order: "sectionOrder",
  thu_tu_chuong: "sectionOrder",
  lesson: "lesson",
  bai: "lesson",
  ten_bai: "lesson",
  lesson_order: "lessonOrder",
  thu_tu_bai: "lessonOrder",
  preview: "preview",
  xem_truoc: "preview",
  is_preview: "preview",
  content: "content",
  noi_dung: "content",
  body: "content",
  mo_ta: "content",
};

export type CourseField =
  | "title"
  | "slug"
  | "description"
  | "priceVnd"
  | "compareAtVnd"
  | "teacherEmail"
  | "publish"
  | "visibility"
  | "categorySlug"
  | "coverUrl"
  | "level"
  | "language";

export type LessonField =
  | "courseSlug"
  | "section"
  | "sectionOrder"
  | "lesson"
  | "lessonOrder"
  | "preview"
  | "content";

export type CsvTable = {
  delimiter: "," | ";" | "\t";
  headers: string[];
  rows: string[][];
};

export type MappedCourseRow = {
  row: number;
  title: string;
  slug: string;
  slugAuto: boolean;
  description: string;
  priceVnd: number;
  compareAtVnd: number | null;
  teacherEmail: string;
  publish: boolean;
  visibility: "PUBLIC" | "UNLISTED" | "PRIVATE";
  categorySlug: string | null;
  coverUrl: string | null;
  level: string | null;
  language: string;
  errors: string[];
  warnings: string[];
};

export type MappedLessonRow = {
  row: number;
  courseSlug: string;
  section: string;
  sectionOrder: number;
  lesson: string;
  lessonOrder: number;
  preview: boolean;
  content: string;
  errors: string[];
  warnings: string[];
};

const COURSE_TEMPLATE_ROWS = [
  [
    "ten_khoa",
    "duong_dan",
    "mo_ta",
    "gia_vnd",
    "gia_goc_vnd",
    "email_giang_vien",
    "xuat_ban",
    "hien_thi",
    "danh_muc",
    "anh_bia",
    "cap_do",
    "ngon_ngu",
  ],
  [
    "Excel từ A đến Z",
    "excel-tu-a-den-z",
    "Khóa nội bộ của trường. Điền email giảng viên đã có trên hệ thống.",
    "1299000",
    "1999000",
    "teacher@edu.local",
    "no",
    "private",
    "",
    "",
    "beginner",
    "vi",
  ],
];

const LESSON_TEMPLATE_ROWS = [
  ["duong_dan_khoa", "chuong", "thu_tu_chuong", "bai", "thu_tu_bai", "xem_truoc", "noi_dung"],
  [
    "excel-tu-a-den-z",
    "Chương 1",
    "1",
    "Giới thiệu khóa học",
    "1",
    "yes",
    "Nội dung bài học do trường soạn. Không dán link video từ trang khác.",
  ],
  ["excel-tu-a-den-z", "Chương 1", "1", "Bài 2", "2", "no", ""],
];

export const COURSE_TEMPLATE_CSV = "\uFEFF" + serializeCsv(COURSE_TEMPLATE_ROWS);
export const LESSON_TEMPLATE_CSV = "\uFEFF" + serializeCsv(LESSON_TEMPLATE_ROWS);

export function serializeCsv(rows: string[][]): string {
  return rows
    .map((row) => row.map(escapeCsvCell).join(","))
    .join("\r\n")
    .concat("\r\n");
}

export function escapeCsvCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function foldHeader(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function slugifyTitle(title: string): string {
  const base = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return base || "khoa-hoc";
}

export function detectFileKindError(text: string): string | null {
  if (text.startsWith("PK")) {
    return "File đang là Excel .xlsx. Mở file mẫu, điền dữ liệu, rồi chọn Lưu thành CSV UTF-8.";
  }
  if (text.includes("\u0000")) {
    return "File không phải CSV UTF-8. Hãy lưu lại từ Excel: CSV UTF-8 (comma delimited).";
  }
  return null;
}

export function detectDelimiter(text: string): "," | ";" | "\t" {
  const first = firstLogicalLine(text);
  const counts: Array<{ delimiter: "," | ";" | "\t"; n: number }> = [
    { delimiter: ",", n: countUnquoted(first, ",") },
    { delimiter: ";", n: countUnquoted(first, ";") },
    { delimiter: "\t", n: countUnquoted(first, "\t") },
  ];
  counts.sort((a, b) => b.n - a.n);
  return counts[0] && counts[0].n > 0 ? counts[0].delimiter : ",";
}

export function parseCsv(text: string, delimiter?: "," | ";" | "\t"): CsvTable {
  const src = text.replace(/^\uFEFF/, "");
  const kindError = detectFileKindError(src);
  if (kindError) {
    throw new Error(kindError);
  }
  const used = delimiter ?? detectDelimiter(src);
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i] ?? "";
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === used) {
      row.push(current);
      current = "";
      continue;
    }
    if (ch === "\n") {
      row.push(current);
      current = "";
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      continue;
    }
    if (ch === "\r") continue;
    current += ch;
  }

  if (inQuotes) {
    throw new Error("CSV có dấu ngoặc kép chưa đóng. Kiểm tra lại ô có dấu phẩy hoặc xuống dòng.");
  }
  if (current.length > 0 || row.length > 0) {
    row.push(current);
    if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  }
  if (rows.length === 0) {
    return { delimiter: used, headers: [], rows: [] };
  }
  const headers = (rows[0] ?? []).map((header) => header.trim());
  return { delimiter: used, headers, rows: rows.slice(1) };
}

export function requireCourseHeaders(headers: string[]): string[] {
  const mapped = headers.map((header) => COURSE_FIELD_ALIASES[foldHeader(header)] ?? null);
  const present = new Set(mapped.filter((field): field is CourseField => field !== null));
  const missing: string[] = [];
  if (!present.has("title")) missing.push("ten_khoa (hoặc title)");
  if (!present.has("teacherEmail")) missing.push("email_giang_vien (hoặc teacher_email)");
  return missing;
}

export function requireLessonHeaders(headers: string[]): string[] {
  const mapped = headers.map((header) => LESSON_FIELD_ALIASES[foldHeader(header)] ?? null);
  const present = new Set(mapped.filter((field): field is LessonField => field !== null));
  const missing: string[] = [];
  if (!present.has("courseSlug")) missing.push("duong_dan_khoa (hoặc course_slug)");
  if (!present.has("section")) missing.push("chuong (hoặc section)");
  if (!present.has("lesson")) missing.push("bai (hoặc lesson)");
  return missing;
}

export function rowToRecord<T extends string>(
  cells: string[],
  fields: Array<T | null>,
): Partial<Record<T, string>> {
  const record: Partial<Record<T, string>> = {};
  for (let i = 0; i < fields.length; i += 1) {
    const field = fields[i];
    if (!field) continue;
    const value = (cells[i] ?? "").trim();
    if (record[field] === undefined) record[field] = value;
  }
  return record;
}

export function parseBoolean(raw: string): boolean | null {
  const key = foldHeader(raw);
  if (!key) return false;
  if (["1", "true", "yes", "y", "x", "co", "da", "xuat_ban", "publish"].includes(key)) return true;
  if (["0", "false", "no", "n", "khong", "chua", ""].includes(key)) return false;
  return null;
}

export function parseVnd(raw: string): { ok: true; value: number } | { ok: false; error: string } {
  const cleaned = raw.trim().replace(/\s/g, "").replace(/₫|vnd|đ/gi, "");
  if (!cleaned) return { ok: true, value: 0 };
  let digits = "";
  if (/^\d+$/.test(cleaned)) {
    digits = cleaned;
  } else if (/^\d{1,3}([.]\d{3})+$/.test(cleaned)) {
    digits = cleaned.replace(/\./g, "");
  } else if (/^\d{1,3}([,]\d{3})+$/.test(cleaned)) {
    digits = cleaned.replace(/,/g, "");
  } else if (/^\d+[.,]00$/.test(cleaned)) {
    digits = cleaned.replace(/[.,]00$/, "");
  } else {
    return { ok: false, error: `Giá "${raw}" phải là số nguyên VND (vd 1299000 hoặc 1.299.000)` };
  }
  const value = Number(digits);
  if (!Number.isSafeInteger(value) || value < 0) {
    return { ok: false, error: `Giá "${raw}" không hợp lệ` };
  }
  if (value > 100_000_000_000) {
    return { ok: false, error: `Giá "${raw}" vượt quá giới hạn` };
  }
  return { ok: true, value };
}

export function parseVisibility(raw: string): "PUBLIC" | "UNLISTED" | "PRIVATE" | null {
  const key = foldHeader(raw);
  if (!key) return null;
  if (["public", "cong_khai", "public_store"].includes(key)) return "PUBLIC";
  if (["unlisted", "khong_liet_ke", "an"].includes(key)) return "UNLISTED";
  if (["private", "rieng_tu", "nhap"].includes(key)) return "PRIVATE";
  return null;
}

export function parseLevel(raw: string): string | null {
  const key = foldHeader(raw);
  if (!key) return null;
  if (["beginner", "co_ban", "basic"].includes(key)) return "beginner";
  if (["intermediate", "trung_cap", "trung_binh"].includes(key)) return "intermediate";
  if (["advanced", "nang_cao", "chuyen_sau"].includes(key)) return "advanced";
  return null;
}

export function parseLanguage(raw: string): string | null {
  const key = foldHeader(raw);
  if (!key) return "vi";
  if (/^[a-z]{2}([_-][a-z]{2})?$/.test(key)) return key.replace("_", "-");
  return null;
}

export function parseOrder(raw: string, fallback: number): { ok: true; value: number } | { ok: false; error: string } {
  if (!raw.trim()) return { ok: true, value: fallback };
  if (!/^\d+$/.test(raw.trim())) {
    return { ok: false, error: `Thứ tự "${raw}" phải là số nguyên dương` };
  }
  const value = Number(raw.trim());
  if (!Number.isSafeInteger(value) || value < 1 || value > 10_000) {
    return { ok: false, error: `Thứ tự "${raw}" không hợp lệ` };
  }
  return { ok: true, value };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseCourseRows(csv: string): { table: CsvTable; courses: MappedCourseRow[] } {
  if (csv.length > MAX_IMPORT_CHARS) {
    throw new Error(`File khóa học quá lớn (tối đa ${MAX_IMPORT_CHARS} ký tự).`);
  }
  const table = parseCsv(csv);
  if (table.headers.length === 0) {
    throw new Error("File khóa học trống. Hãy dùng đúng mẫu CSV.");
  }
  const missing = requireCourseHeaders(table.headers);
  if (missing.length) {
    throw new Error(`Thiếu cột bắt buộc: ${missing.join(", ")}. Tải lại file mẫu.`);
  }
  if (table.rows.length === 0) {
    throw new Error("File khóa học chỉ có tiêu đề, chưa có dòng dữ liệu.");
  }
  if (table.rows.length > MAX_COURSE_ROWS) {
    throw new Error(`Tối đa ${MAX_COURSE_ROWS} khóa mỗi lần nhập. File đang có ${table.rows.length} dòng.`);
  }
  const fields = table.headers.map((header) => COURSE_FIELD_ALIASES[foldHeader(header)] ?? null);
  const seenSlugs = new Map<string, number>();
  const courses = table.rows.map((cells, index) =>
    mapCourseRow(rowToRecord(cells, fields), index + 2, seenSlugs),
  );
  return { table, courses };
}

export function parseLessonRows(csv: string): { table: CsvTable; lessons: MappedLessonRow[] } {
  if (!csv.trim()) return { table: { delimiter: ",", headers: [], rows: [] }, lessons: [] };
  if (csv.length > MAX_IMPORT_CHARS) {
    throw new Error(`File bài học quá lớn (tối đa ${MAX_IMPORT_CHARS} ký tự).`);
  }
  const table = parseCsv(csv);
  if (table.headers.length === 0) {
    return { table, lessons: [] };
  }
  const missing = requireLessonHeaders(table.headers);
  if (missing.length) {
    throw new Error(`File bài học thiếu cột: ${missing.join(", ")}.`);
  }
  if (table.rows.length > MAX_LESSON_ROWS) {
    throw new Error(`Tối đa ${MAX_LESSON_ROWS} bài mỗi lần nhập. File đang có ${table.rows.length} dòng.`);
  }
  const fields = table.headers.map((header) => LESSON_FIELD_ALIASES[foldHeader(header)] ?? null);
  const sectionCursor = new Map<string, number>();
  const lessonCursor = new Map<string, number>();
  const lessons = table.rows.map((cells, index) => {
    const record = rowToRecord(cells, fields);
    return mapLessonRow(record, index + 2, sectionCursor, lessonCursor);
  });
  return { table, lessons };
}

export function mapCourseRow(
  record: Partial<Record<CourseField, string>>,
  row: number,
  seenSlugs: Map<string, number>,
): MappedCourseRow {
  const errors: string[] = [];
  const warnings: string[] = [];
  const title = (record.title ?? "").trim();
  if (title.length < 2) errors.push("Tên khóa phải từ 2 ký tự.");
  if (title.length > 200) errors.push("Tên khóa tối đa 200 ký tự.");

  const rawSlug = (record.slug ?? "").trim();
  const slug = slugifyTitle(rawSlug || title);
  const slugAuto = !rawSlug;
  if (slugAuto) warnings.push(`Đường dẫn tự tạo: ${slug}`);
  if (rawSlug && slug !== foldHeader(rawSlug).replace(/_/g, "-") && slug !== rawSlug.toLowerCase()) {
    warnings.push(`Đường dẫn đã chuẩn hóa thành ${slug}`);
  }
  const firstRow = seenSlugs.get(slug);
  if (firstRow) errors.push(`Đường dẫn "${slug}" trùng dòng ${firstRow} trong cùng file.`);
  else seenSlugs.set(slug, row);

  const description = (record.description ?? "").trim();
  if (description.length > 20_000) errors.push("Mô tả tối đa 20.000 ký tự.");

  const price = parseVnd(record.priceVnd ?? "");
  if (!price.ok) errors.push(price.error);
  const compare = parseVnd(record.compareAtVnd ?? "");
  if (!compare.ok) errors.push(compare.error);
  if (price.ok && compare.ok && compare.value > 0 && compare.value < price.value) {
    warnings.push("Giá gốc đang thấp hơn giá bán.");
  }

  const teacherEmail = (record.teacherEmail ?? "").trim().toLowerCase();
  if (!teacherEmail) errors.push("Thiếu email giảng viên. Phải là tài khoản đã có trên hệ thống.");
  else if (!EMAIL_RE.test(teacherEmail)) errors.push(`Email giảng viên không hợp lệ: ${teacherEmail}`);

  const publishParsed = parseBoolean(record.publish ?? "");
  if (publishParsed === null) errors.push(`Cột xuất bản không hiểu giá trị "${record.publish}". Dùng yes/no hoặc có/không.`);
  const publish = publishParsed === true;

  const visibilityRaw = (record.visibility ?? "").trim();
  let visibility: "PUBLIC" | "UNLISTED" | "PRIVATE" = publish ? "PUBLIC" : "PRIVATE";
  if (visibilityRaw) {
    const parsed = parseVisibility(visibilityRaw);
    if (!parsed) errors.push(`Hiển thị phải là public, unlisted hoặc private (đang là "${visibilityRaw}").`);
    else visibility = parsed;
  }

  const categorySlugRaw = (record.categorySlug ?? "").trim();
  const categorySlug = categorySlugRaw ? slugifyTitle(categorySlugRaw) : null;

  const coverUrl = (record.coverUrl ?? "").trim() || null;
  if (coverUrl) {
    if (!/^https?:\/\/.+/i.test(coverUrl)) {
      errors.push("Ảnh bìa phải là URL http hoặc https.");
    } else if (/unica\.vn/i.test(coverUrl)) {
      errors.push("Không được dùng ảnh từ unica.vn. Hãy dùng ảnh của trường.");
    } else if (coverUrl.length > 2048) {
      errors.push("URL ảnh bìa quá dài.");
    } else if (!/^https:\/\//i.test(coverUrl)) {
      warnings.push("Ảnh bìa đang dùng http. Nên dùng https.");
    }
  }

  const levelRaw = (record.level ?? "").trim();
  let level: string | null = null;
  if (levelRaw) {
    level = parseLevel(levelRaw);
    if (!level) errors.push(`Cấp độ phải là beginner, intermediate hoặc advanced (đang là "${levelRaw}").`);
  }

  const languageRaw = (record.language ?? "").trim();
  const language = parseLanguage(languageRaw);
  if (language === null) errors.push(`Ngôn ngữ không hợp lệ: "${languageRaw}". Dùng vi hoặc en.`);

  if (/unica\.vn/i.test(description)) {
    warnings.push("Mô tả có nhắc unica.vn. Chỉ nhập khóa của trường, không sao chép catalog Unica.");
  }

  return {
    row,
    title,
    slug,
    slugAuto,
    description,
    priceVnd: price.ok ? price.value : 0,
    compareAtVnd: compare.ok && compare.value > 0 ? compare.value : null,
    teacherEmail,
    publish,
    visibility,
    categorySlug,
    coverUrl,
    level,
    language: language ?? "vi",
    errors,
    warnings,
  };
}

export function mapLessonRow(
  record: Partial<Record<LessonField, string>>,
  row: number,
  sectionCursor: Map<string, number>,
  lessonCursor: Map<string, number>,
): MappedLessonRow {
  const errors: string[] = [];
  const warnings: string[] = [];
  const courseSlugRaw = (record.courseSlug ?? "").trim();
  const courseSlug = courseSlugRaw ? slugifyTitle(courseSlugRaw) : "";
  if (!courseSlug) errors.push("Thiếu đường dẫn khóa (duong_dan_khoa).");

  const section = (record.section ?? "").trim();
  if (!section) errors.push("Thiếu tên chương.");
  if (section.length > 200) errors.push("Tên chương tối đa 200 ký tự.");

  const lesson = (record.lesson ?? "").trim();
  if (!lesson) errors.push("Thiếu tên bài.");
  if (lesson.length > 200) errors.push("Tên bài tối đa 200 ký tự.");

  const sectionKey = `${courseSlug}::${section}`;
  const nextSection = sectionCursor.get(courseSlug) ?? 0;
  if (!(record.sectionOrder ?? "").trim() && !sectionCursor.has(sectionKey)) {
    sectionCursor.set(courseSlug, nextSection + 1);
    sectionCursor.set(sectionKey, nextSection + 1);
  }
  const sectionFallback = sectionCursor.get(sectionKey) ?? nextSection + 1;
  const sectionParsed = parseOrder(record.sectionOrder ?? "", sectionFallback);
  if (!sectionParsed.ok) errors.push(sectionParsed.error);
  if (sectionParsed.ok) sectionCursor.set(sectionKey, sectionParsed.value);

  const lessonKey = `${courseSlug}::${section}`;
  const nextLesson = (lessonCursor.get(lessonKey) ?? 0) + 1;
  const lessonParsed = parseOrder(record.lessonOrder ?? "", nextLesson);
  if (!lessonParsed.ok) errors.push(lessonParsed.error);
  if (lessonParsed.ok) lessonCursor.set(lessonKey, lessonParsed.value);

  const previewParsed = parseBoolean(record.preview ?? "");
  if (previewParsed === null) errors.push(`Xem trước không hiểu giá trị "${record.preview}". Dùng yes/no.`);

  const content = (record.content ?? "").trim();
  if (content.length > 20_000) errors.push("Nội dung bài tối đa 20.000 ký tự.");
  if (/unica\.vn/i.test(content)) {
    errors.push("Không dán link hoặc nội dung từ unica.vn.");
  }

  return {
    row,
    courseSlug,
    section,
    sectionOrder: sectionParsed.ok ? sectionParsed.value : sectionFallback,
    lesson,
    lessonOrder: lessonParsed.ok ? lessonParsed.value : nextLesson,
    preview: previewParsed === true,
    content,
    errors,
    warnings,
  };
}

function firstLogicalLine(text: string): string {
  const src = text.replace(/^\uFEFF/, "");
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i] ?? "";
    if (inQuotes) {
      if (ch === '"' && src[i + 1] === '"') {
        current += '""';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
        current += ch;
      } else {
        current += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      current += ch;
      continue;
    }
    if (ch === "\n") break;
    if (ch !== "\r") current += ch;
  }
  return current;
}

function countUnquoted(line: string, delimiter: string): number {
  let count = 0;
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (!inQuotes && ch === delimiter) count += 1;
  }
  return count;
}
