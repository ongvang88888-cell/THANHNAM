"use client";

import { useEffect, useMemo, useState } from "react";
import { apiDelete, apiGet, apiPatch, apiPost, formatVnd } from "@/lib/api";
import { hasRole, useRequireAuth } from "@/lib/auth";
import { productTypeLabel, statusLabel, statusTone } from "@/lib/labels";

type CatalogRow = {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  visibility: string;
  description: string;
  creatorUserId: string | null;
  creator: { id: string; email: string; displayName: string } | null;
  priceMinor: number;
  compareAtMinor: number | null;
  courseId: string | null;
  sectionCount: number;
  orderCount: number;
  updatedAt: string;
};

type AdminUser = {
  id: string;
  email: string;
  displayName: string;
  status: string;
  roles: string[];
};

const EMPTY_FORM = {
  title: "",
  slug: "",
  description: "",
  priceMinor: 0,
  creatorUserId: "",
  publishNow: false,
};

export default function AdminCoursesPage() {
  const { token, user, ready } = useRequireAuth();
  const canMutate = hasRole(user, ["admin"]);
  const [rows, setRows] = useState<CatalogRow[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("VIDEO_COURSE");
  const [form, setForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState<CatalogRow | null>(null);
  const [edit, setEdit] = useState({
    name: "",
    slug: "",
    description: "",
    priceMinor: 0,
    creatorUserId: "",
    visibility: "PRIVATE",
  });
  const [busy, setBusy] = useState(false);

  const teachers = useMemo(
    () => users.filter((row) => row.roles.some((role) => ["teacher", "admin", "super_admin"].includes(role))),
    [users],
  );

  async function load() {
    if (!token) return;
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (status) params.set("status", status);
    if (type) params.set("type", type);
    const qs = params.toString();
    const [products, people] = await Promise.all([
      apiGet<CatalogRow[]>(`/admin/products${qs ? `?${qs}` : ""}`, token),
      apiGet<AdminUser[]>("/admin/users", token),
    ]);
    setRows(products);
    setUsers(people);
    if (!form.creatorUserId) {
      const first = people.find((row) => row.roles.includes("teacher")) ?? people[0];
      if (first) setForm((prev) => ({ ...prev, creatorUserId: first.id }));
    }
  }

  useEffect(() => {
    if (!ready || !token) return;
    load().catch((e: Error) => setError(e.message));
  }, [ready, token]);

  function flash(ok: string) {
    setMsg(ok);
    setError(null);
  }

  async function createCourse() {
    if (!token || !canMutate) return;
    setBusy(true);
    try {
      const created = await apiPost<CatalogRow>("/admin/courses", {
        title: form.title.trim(),
        slug: form.slug.trim() || undefined,
        description: form.description.trim(),
        priceMinor: Number(form.priceMinor) || 0,
        creatorUserId: form.creatorUserId || undefined,
        publishNow: form.publishNow,
      }, token);
      flash("Đã tạo khóa học");
      setForm({ ...EMPTY_FORM, creatorUserId: form.creatorUserId });
      setEditing(created);
      setEdit({
        name: created.name,
        slug: created.slug,
        description: created.description,
        priceMinor: created.priceMinor,
        creatorUserId: created.creatorUserId ?? "",
        visibility: created.visibility,
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tạo được khóa học");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    if (!token || !canMutate || !editing) return;
    setBusy(true);
    try {
      const updated = await apiPatch<CatalogRow>(`/admin/products/${editing.id}`, {
        name: edit.name.trim(),
        slug: edit.slug.trim(),
        description: edit.description,
        priceMinor: Number(edit.priceMinor) || 0,
        creatorUserId: edit.creatorUserId || undefined,
        visibility: edit.visibility,
      }, token);
      setEditing(updated);
      flash("Đã lưu thay đổi");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được");
    } finally {
      setBusy(false);
    }
  }

  async function act(path: string, ok: string) {
    if (!token || !canMutate) return;
    setBusy(true);
    try {
      await apiPost(path, {}, token);
      flash(ok);
      setEditing(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Thao tác thất bại");
    } finally {
      setBusy(false);
    }
  }

  async function remove(row: CatalogRow, hard: boolean) {
    if (!token || !canMutate) return;
    const label = hard
      ? `Xóa vĩnh viễn "${row.name}"? Chỉ dùng cho bản nháp/lưu trữ chưa có đơn.`
      : `Ẩn và lưu trữ "${row.name}"? Học viên sẽ không còn thấy khóa trên gian hàng.`;
    if (!confirm(label)) return;
    setBusy(true);
    try {
      await apiDelete(`/admin/products/${row.id}${hard ? "?hard=1" : ""}`, token);
      flash(hard ? "Đã xóa vĩnh viễn" : "Đã lưu trữ khóa học");
      if (editing?.id === row.id) setEditing(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không xóa được");
    } finally {
      setBusy(false);
    }
  }

  function openEdit(row: CatalogRow) {
    setEditing(row);
    setEdit({
      name: row.name,
      slug: row.slug,
      description: row.description,
      priceMinor: row.priceMinor,
      creatorUserId: row.creatorUserId ?? "",
      visibility: row.visibility,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (ready && user && !hasRole(user, ["admin", "support_agent"])) {
    return <p className="error">Tài khoản này không có quyền quản trị.</p>;
  }

  return (
    <section className="u-wrap">
      <div className="page-head">
        <h1>Quản lý khóa học</h1>
        <p className="muted">Người quản lý thêm, sửa, ẩn hoặc xóa toàn bộ khóa học của trường.</p>
      </div>
      <nav className="admin-nav">
        <a href="/admin">Tổng quan</a>
        <a className="is-on" href="/admin/courses">Quản lý khóa học</a>
        <a href="/admin/courses/import">Nhập hàng loạt</a>
      </nav>

      {error && <p className="toast error">{error}</p>}
      {msg && <p className="toast ok">{msg}</p>}

      <div className="note-box">
        <strong>Đồng bộ Unica:</strong> không thể sao chép hợp pháp toàn bộ catalog unica.vn
        (video, giáo trình, ảnh giảng viên) vào phần mềm này. Unica không công bố API xuất khóa học
        của họ. Cách hợp lệ: tự tạo khóa của trường, hoặc dùng chương trình giảng viên / affiliate
        của Unica để bán hoặc giới thiệu khóa trên unica.vn.
      </div>

      {canMutate && (
        <div className="split" style={{ marginBottom: 24 }}>
          <div className="panel">
            <h2>Thêm khóa học</h2>
            <p className="muted">
              Có nhiều khóa? Dùng <a href="/admin/courses/import">nhập hàng loạt CSV</a> với kiểm tra từng dòng.
            </p>
            <div className="admin-form-grid">
              <div>
                <label>Tên khóa</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ví dụ: Excel từ cơ bản đến nâng cao"
                />
              </div>
              <div>
                <label>Đường dẫn (để trống sẽ tự tạo)</label>
                <input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="excel-co-ban"
                />
              </div>
              <div>
                <label>Giá (VND)</label>
                <input
                  type="number"
                  min={0}
                  value={form.priceMinor}
                  onChange={(e) => setForm({ ...form, priceMinor: Number(e.target.value) })}
                />
              </div>
              <div>
                <label>Giảng viên phụ trách</label>
                <select
                  value={form.creatorUserId}
                  onChange={(e) => setForm({ ...form, creatorUserId: e.target.value })}
                >
                  {teachers.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.displayName} · {row.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <label>Mô tả</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Tóm tắt khóa học hiển thị trên gian hàng"
            />
            <label className="check">
              <input
                type="checkbox"
                checked={form.publishNow}
                onChange={(e) => setForm({ ...form, publishNow: e.target.checked })}
              />
              Xuất bản ngay lên gian hàng
            </label>
            <button type="button" disabled={busy || form.title.trim().length < 2} onClick={() => void createCourse()}>
              Tạo khóa học
            </button>
          </div>

          {editing && (
            <div className="panel">
              <h2>Sửa khóa học</h2>
              <p className="muted">{editing.type} · {editing.slug}</p>
              <label>Tên</label>
              <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
              <label>Đường dẫn</label>
              <input value={edit.slug} onChange={(e) => setEdit({ ...edit, slug: e.target.value })} />
              <label>Giá (VND)</label>
              <input
                type="number"
                min={0}
                value={edit.priceMinor}
                onChange={(e) => setEdit({ ...edit, priceMinor: Number(e.target.value) })}
              />
              <label>Giảng viên</label>
              <select
                value={edit.creatorUserId}
                onChange={(e) => setEdit({ ...edit, creatorUserId: e.target.value })}
              >
                {users.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.displayName} · {row.email}
                  </option>
                ))}
              </select>
              <label>Hiển thị</label>
              <select
                value={edit.visibility}
                onChange={(e) => setEdit({ ...edit, visibility: e.target.value })}
              >
                <option value="PUBLIC">Công khai</option>
                <option value="UNLISTED">Không liệt kê</option>
                <option value="PRIVATE">Riêng tư</option>
              </select>
              <label>Mô tả</label>
              <textarea value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
              <div className="admin-actions">
                <button type="button" disabled={busy} onClick={() => void saveEdit()}>
                  Lưu
                </button>
                {editing.courseId && (
                  <a className="btn secondary" href={`/teacher/courses/${editing.courseId}`}>
                    Sửa giáo trình
                  </a>
                )}
                <button type="button" className="ghost" onClick={() => setEditing(null)}>
                  Đóng
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="panel">
        <h2>Danh sách khóa học</h2>
        <div className="admin-filters">
          <div>
            <label>Tìm kiếm</label>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tên hoặc đường dẫn" />
          </div>
          <div>
            <label>Trạng thái</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Tất cả</option>
              <option value="DRAFT">Bản nháp</option>
              <option value="IN_REVIEW">Chờ duyệt</option>
              <option value="PUBLISHED">Đã xuất bản</option>
              <option value="ARCHIVED">Đã lưu trữ</option>
              <option value="REJECTED">Từ chối</option>
            </select>
          </div>
          <div>
            <label>Loại</label>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">Tất cả</option>
              <option value="VIDEO_COURSE">Khóa học</option>
              <option value="DIGITAL_DOCUMENT">Tài liệu</option>
              <option value="COURSE_BUNDLE">Combo khóa học</option>
              <option value="DOCUMENT_BUNDLE">Combo tài liệu</option>
              <option value="MIXED_BUNDLE">Combo</option>
            </select>
          </div>
          <button type="button" className="secondary" onClick={() => void load().catch((e: Error) => setError(e.message))}>
            Lọc
          </button>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Khóa học</th>
                <th>Giảng viên</th>
                <th>Giá</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted">Chưa có khóa học phù hợp bộ lọc.</td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.name}</strong>
                    <div className="muted">
                      {productTypeLabel(row.type)} · /{row.slug}
                      {row.courseId ? ` · ${row.sectionCount} chương` : ""}
                    </div>
                  </td>
                  <td>{row.creator?.displayName ?? "—"}</td>
                  <td>{formatVnd(row.priceMinor)}</td>
                  <td>
                    <span className={`badge ${statusTone(row.status)}`}>{statusLabel(row.status)}</span>
                    <div className="muted">{statusLabel(row.visibility)}</div>
                  </td>
                  <td>
                    <div className="admin-actions">
                      <button type="button" className="btn-sm ghost" onClick={() => openEdit(row)}>
                        Sửa
                      </button>
                      {row.courseId && (
                        <a className="btn btn-sm secondary" href={`/teacher/courses/${row.courseId}`}>
                          Giáo trình
                        </a>
                      )}
                      {canMutate && row.status !== "PUBLISHED" && (
                        <button
                          type="button"
                          className="btn-sm"
                          disabled={busy}
                          onClick={() => void act(`/admin/products/${row.id}/publish`, "Đã xuất bản")}
                        >
                          Xuất bản
                        </button>
                      )}
                      {canMutate && row.status === "PUBLISHED" && (
                        <button
                          type="button"
                          className="btn-sm secondary"
                          disabled={busy}
                          onClick={() => void act(`/admin/products/${row.id}/unpublish`, "Đã gỡ khỏi gian hàng")}
                        >
                          Gỡ xuất bản
                        </button>
                      )}
                      {canMutate && row.status !== "ARCHIVED" && (
                        <button
                          type="button"
                          className="btn-sm ghost"
                          disabled={busy}
                          onClick={() => void remove(row, false)}
                        >
                          Lưu trữ
                        </button>
                      )}
                      {canMutate && ["DRAFT", "REJECTED", "ARCHIVED"].includes(row.status) && row.orderCount === 0 && (
                        <button
                          type="button"
                          className="btn-sm danger"
                          disabled={busy}
                          onClick={() => void remove(row, true)}
                        >
                          Xóa
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
