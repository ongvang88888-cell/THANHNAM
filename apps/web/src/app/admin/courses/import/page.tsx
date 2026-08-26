"use client";

import { useEffect, useMemo, useState } from "react";
import { API_URL, APP_ID, apiGet, apiPost, formatVnd } from "@/lib/api";
import { hasRole, useRequireAuth } from "@/lib/auth";
import { FileDrop } from "@/components/FileDrop";

type LookupTeacher = { email: string; displayName: string; roles: string[] };
type LookupCategory = { slug: string; name: string };

type PreviewRow = {
  row: number;
  title: string;
  slug: string;
  teacherEmail: string;
  teacherName: string | null;
  priceVnd: number;
  publish: boolean;
  visibility: string;
  status: "ok" | "error" | "skip";
  errors: string[];
  warnings: string[];
  lessonCount: number;
};

type LessonPreviewRow = {
  row: number;
  courseSlug: string;
  section: string;
  lesson: string;
  errors: string[];
};

type Preview = {
  summary: {
    total: number;
    valid: number;
    invalid: number;
    skipped: number;
    lessonTotal: number;
    lessonInvalid: number;
    canCommitAll: boolean;
    canCommitValid: boolean;
  };
  courses: PreviewRow[];
  lessons: LessonPreviewRow[];
  teachers: LookupTeacher[];
  categories: LookupCategory[];
};

type CommitResult = {
  ok: boolean;
  imported: number;
  skipped: number;
  blocked: number;
  courses: Array<{ row: number; title: string; slug: string; productId: string; published: boolean }>;
};

async function readCsvFile(file: File): Promise<string> {
  const text = await file.text();
  if (file.name.toLowerCase().endsWith(".xlsx") || text.startsWith("PK")) {
    throw new Error("File Excel .xlsx chưa dùng được. Mở mẫu, điền xong, chọn Lưu thành CSV UTF-8.");
  }
  return text;
}

async function downloadTemplate(path: string, filename: string, token: string) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-App-Id": APP_ID,
    },
  });
  if (!res.ok) throw new Error("Không tải được file mẫu");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function AdminCourseImportPage() {
  const { token, user, ready } = useRequireAuth();
  const canMutate = hasRole(user, ["admin"]);
  const [teachers, setTeachers] = useState<LookupTeacher[]>([]);
  const [categories, setCategories] = useState<LookupCategory[]>([]);
  const [csv, setCsv] = useState("");
  const [lessonsCsv, setLessonsCsv] = useState("");
  const [courseName, setCourseName] = useState("");
  const [lessonName, setLessonName] = useState("");
  const [onConflict, setOnConflict] = useState<"fail" | "skip">("fail");
  const [importMode, setImportMode] = useState<"all" | "valid_only">("all");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<CommitResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ready || !token) return;
    apiGet<{ teachers: LookupTeacher[]; categories: LookupCategory[] }>("/admin/courses/import/lookups", token)
      .then((data) => {
        setTeachers(data.teachers);
        setCategories(data.categories);
      })
      .catch((e: Error) => setError(e.message));
  }, [ready, token]);

  const payload = useMemo(
    () => ({
      csv,
      lessonsCsv: lessonsCsv.trim() || undefined,
      onConflict,
      importMode,
    }),
    [csv, lessonsCsv, onConflict, importMode],
  );

  async function runPreview() {
    if (!token || !canMutate) return;
    setBusy(true);
    setResult(null);
    try {
      const data = await apiPost<Preview>("/admin/courses/import/preview", payload, token);
      setPreview(data);
      setError(null);
      setMsg(
        data.summary.canCommitAll
          ? `Đã kiểm tra ${data.summary.total} khóa: đủ điều kiện ghi 100%.`
          : `Đã kiểm tra ${data.summary.total} khóa: ${data.summary.valid} đúng, ${data.summary.invalid} lỗi, ${data.summary.skipped} bỏ qua.`,
      );
    } catch (e) {
      setPreview(null);
      setError(e instanceof Error ? e.message : "Không kiểm tra được file");
    } finally {
      setBusy(false);
    }
  }

  async function runCommit() {
    if (!token || !canMutate || !preview) return;
    const label =
      importMode === "all"
        ? `Ghi ${preview.summary.valid} khóa? Nếu còn một dòng lỗi, hệ thống sẽ không ghi khóa nào.`
        : `Chỉ ghi ${preview.summary.valid} dòng đúng và bỏ qua ${preview.summary.invalid} dòng lỗi?`;
    if (!confirm(label)) return;
    setBusy(true);
    try {
      const data = await apiPost<CommitResult>("/admin/courses/import/commit", payload, token);
      setResult(data);
      setError(null);
      setMsg(`Đã nhập ${data.imported} khóa học.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không ghi được");
    } finally {
      setBusy(false);
    }
  }

  if (ready && user && !hasRole(user, ["admin", "support_agent"])) {
    return <p className="error">Tài khoản này không có quyền quản trị.</p>;
  }

  const canCommit =
    !!preview &&
    !result &&
    (importMode === "all" ? preview.summary.canCommitAll : preview.summary.canCommitValid);

  return (
    <section className="u-wrap">
      <div className="page-head">
        <h1>Nhập hàng loạt khóa học</h1>
        <p className="muted">
          Nhập catalog của trường từ CSV. Hệ thống kiểm tra từng dòng trước, chỉ ghi khi dữ liệu khớp tài khoản và danh mục thật.
        </p>
      </div>
      <nav className="admin-nav">
        <a href="/admin">Tổng quan</a>
        <a href="/admin/courses">Quản lý khóa học</a>
        <a className="is-on" href="/admin/courses/import">Nhập hàng loạt</a>
      </nav>

      {error && <p className="toast error">{error}</p>}
      {msg && <p className="toast ok">{msg}</p>}

      <div className="note-box">
        <strong>Để nhập đúng 100%:</strong> dùng đúng file mẫu, email giảng viên phải đã có trên hệ thống,
        danh mục (nếu điền) phải đã tồn tại, đường dẫn không trùng. Mặc định nếu một dòng sai thì không ghi khóa nào.
        Không nhập catalog hay ảnh/video từ unica.vn.
      </div>

      {!canMutate && <p className="muted">Tài khoản hỗ trợ chỉ xem, không được ghi hàng loạt.</p>}

      <div className="split" style={{ marginBottom: 24 }}>
        <div className="panel">
          <h2>1. Tải mẫu</h2>
          <p className="muted">Mở bằng Excel, điền khóa của trường, rồi Lưu thành CSV UTF-8.</p>
          <div className="admin-actions">
            <button
              type="button"
              className="btn-sm"
              disabled={!token || busy}
              onClick={() => token && downloadTemplate("/admin/courses/import/template", "mau-khoa-hoc.csv", token).catch((e: Error) => setError(e.message))}
            >
              Tải mẫu khóa học
            </button>
            <button
              type="button"
              className="btn-sm secondary"
              disabled={!token || busy}
              onClick={() => token && downloadTemplate("/admin/courses/import/lessons-template", "mau-bai-hoc.csv", token).catch((e: Error) => setError(e.message))}
            >
              Tải mẫu chương/bài
            </button>
          </div>
          <h3 style={{ marginTop: 20 }}>Email giảng viên đang có</h3>
          {teachers.length === 0 && <p className="muted">Chưa có giảng viên. Tạo tài khoản trước.</p>}
          <ul className="import-chips">
            {teachers.map((row) => (
              <li key={row.email}>
                <button type="button" className="plain" onClick={() => void navigator.clipboard.writeText(row.email)}>
                  {row.displayName} · {row.email}
                </button>
              </li>
            ))}
          </ul>
          {categories.length > 0 && (
            <>
              <h3>Danh mục hiện có</h3>
              <ul className="import-chips">
                {categories.map((row) => (
                  <li key={row.slug}>
                    <button type="button" className="plain" onClick={() => void navigator.clipboard.writeText(row.slug)}>
                      {row.name} · {row.slug}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="panel">
          <h2>2. Đưa file vào</h2>
          <FileDrop
            accept=".csv,text/csv,text/plain,.txt"
            disabled={!canMutate || busy}
            label={courseName || "Thả file khóa học CSV"}
            hint="Bắt buộc. Tối đa 200 khóa / lần."
            onFile={(file) => {
              readCsvFile(file)
                .then((text) => {
                  setCsv(text);
                  setCourseName(file.name);
                  setPreview(null);
                  setResult(null);
                })
                .catch((e: Error) => setError(e.message));
            }}
          />
          <FileDrop
            accept=".csv,text/csv,text/plain,.txt"
            disabled={!canMutate || busy}
            label={lessonName || "Thả file chương/bài (tuỳ chọn)"}
            hint="Nếu bỏ trống, mỗi khóa sẽ có Chương 1."
            onFile={(file) => {
              readCsvFile(file)
                .then((text) => {
                  setLessonsCsv(text);
                  setLessonName(file.name);
                  setPreview(null);
                  setResult(null);
                })
                .catch((e: Error) => setError(e.message));
            }}
          />
          <label>Hoặc dán CSV khóa học</label>
          <textarea
            value={csv}
            disabled={!canMutate}
            onChange={(e) => {
              setCsv(e.target.value);
              setPreview(null);
              setResult(null);
            }}
            placeholder="dán nội dung CSV hoặc bảng copy từ Excel"
            rows={6}
          />
          <fieldset className="import-options">
            <legend>Khi đường dẫn đã tồn tại</legend>
            <label className="check">
              <input type="radio" name="conflict" checked={onConflict === "fail"} onChange={() => { setOnConflict("fail"); setPreview(null); }} />
              Báo lỗi, không ghi cả lô
            </label>
            <label className="check">
              <input type="radio" name="conflict" checked={onConflict === "skip"} onChange={() => { setOnConflict("skip"); setPreview(null); }} />
              Bỏ qua khóa trùng, giữ khóa cũ
            </label>
          </fieldset>
          <fieldset className="import-options">
            <legend>Cách ghi</legend>
            <label className="check">
              <input type="radio" name="mode" checked={importMode === "all"} onChange={() => setImportMode("all")} />
              Chỉ ghi khi 100% dòng đúng
            </label>
            <label className="check">
              <input type="radio" name="mode" checked={importMode === "valid_only"} onChange={() => setImportMode("valid_only")} />
              Chỉ ghi các dòng đúng, bỏ dòng lỗi
            </label>
          </fieldset>
          <div className="admin-actions">
            <button type="button" disabled={!canMutate || busy || !csv.trim()} onClick={() => void runPreview()}>
              {busy ? "Đang kiểm tra..." : "3. Kiểm tra trước khi ghi"}
            </button>
            <button type="button" className="secondary" disabled={!canCommit || busy} onClick={() => void runCommit()}>
              4. Ghi vào hệ thống
            </button>
          </div>
        </div>
      </div>

      {preview && (
        <div className="panel" style={{ marginBottom: 24 }}>
          <h2>Kết quả kiểm tra</h2>
          <div className="stats-grid">
            <div className="stat">
              <div className="label">Tổng dòng</div>
              <p className="value">{preview.summary.total}</p>
            </div>
            <div className="stat">
              <div className="label">Đúng</div>
              <p className="value">{preview.summary.valid}</p>
            </div>
            <div className="stat">
              <div className="label">Lỗi</div>
              <p className="value">{preview.summary.invalid}</p>
            </div>
            <div className="stat">
              <div className="label">Bỏ qua</div>
              <p className="value">{preview.summary.skipped}</p>
            </div>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Dòng</th>
                  <th>Trạng thái</th>
                  <th>Tên / đường dẫn</th>
                  <th>Giảng viên</th>
                  <th>Giá</th>
                  <th>Xuất bản</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {preview.courses.map((row) => (
                  <tr key={`${row.row}-${row.slug}`}>
                    <td>{row.row}</td>
                    <td>
                      <span className={`import-status is-${row.status}`}>
                        {row.status === "ok" ? "Đúng" : row.status === "skip" ? "Bỏ qua" : "Lỗi"}
                      </span>
                    </td>
                    <td>
                      <strong>{row.title}</strong>
                      <div className="muted">{row.slug} · {row.lessonCount} bài</div>
                    </td>
                    <td>
                      {row.teacherName || "—"}
                      <div className="muted">{row.teacherEmail}</div>
                    </td>
                    <td>{formatVnd(row.priceVnd)}</td>
                    <td>{row.publish ? `Có · ${row.visibility}` : `Nháp · ${row.visibility}`}</td>
                    <td>
                      {row.errors.map((item) => (
                        <div key={item} className="import-err">{item}</div>
                      ))}
                      {row.warnings.map((item) => (
                        <div key={item} className="import-warn">{item}</div>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.lessons.length > 0 && (
            <>
              <h3>Lỗi file bài học</h3>
              <ul>
                {preview.lessons.map((row) => (
                  <li key={`${row.row}-${row.lesson}`}>
                    Dòng {row.row} · {row.courseSlug} / {row.section} / {row.lesson}: {row.errors.join("; ")}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {result && (
        <div className="panel">
          <h2>Đã ghi {result.imported} khóa</h2>
          <ul className="lesson-list">
            {result.courses.map((row) => (
              <li key={row.productId}>
                <span>
                  {row.title} · {row.slug} {row.published ? "(đã xuất bản)" : "(bản nháp)"}
                </span>
                <a href={`/admin/courses`}>Mở danh sách</a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
