"use client";

import { useEffect, useState } from "react";
import { AutoVideoPublish } from "@/components/AutoVideoPublish";
import { FileDrop } from "@/components/FileDrop";
import { VideoInbox } from "@/components/VideoInbox";
import { LazyVideoAiEditPanel } from "@/components/VideoAiEditPanel";
import { apiGet, apiPost, apiPutBinary, formatVnd } from "@/lib/api";
import { hasRole, useRequireAuth } from "@/lib/auth";
import { productTypeLabel, statusLabel, statusTone } from "@/lib/labels";

type CourseRow = {
  id: string;
  title: string;
  status: string;
  product?: { id: string; status: string; slug: string; prices?: Array<{ amountMinor: number }> };
};

type DocRow = {
  id: string;
  title: string;
  status: string;
  product?: { id: string; status: string; slug: string };
  versions?: Array<{ id: string; version: number }>;
};

type BundleRow = {
  id: string;
  name: string;
  type: string;
  status: string;
  slug: string;
  prices?: Array<{ amountMinor: number }>;
};

type CourseDetail = {
  id: string;
  title: string;
  sections: Array<{
    id: string;
    title: string;
    lessons: Array<{ id: string; title: string }>;
  }>;
};

type Tab = "courses" | "documents" | "bundles" | "upload" | "affiliate";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "courses", label: "Khóa học" },
  { id: "documents", label: "Tài liệu bán" },
  { id: "bundles", label: "Combo" },
  { id: "upload", label: "Tải video / AI" },
  { id: "affiliate", label: "Affiliate" },
];

function tabFromLocation(): Tab {
  if (typeof window === "undefined") return "courses";
  const raw = new URLSearchParams(window.location.search).get("tab") ?? window.location.hash.replace("#", "");
  return TABS.some((item) => item.id === raw) ? (raw as Tab) : "courses";
}

export default function TeacherPage() {
  const { token, user, ready } = useRequireAuth();
  const [tab, setTab] = useState<Tab>("courses");
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [documents, setDocuments] = useState<DocRow[]>([]);
  const [bundles, setBundles] = useState<BundleRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [courseTitle, setCourseTitle] = useState("Khóa học mới");
  const [courseSlug, setCourseSlug] = useState(`khoa-hoc-${Date.now()}`);
  const [docTitle, setDocTitle] = useState("Tài liệu mới");
  const [docSlug, setDocSlug] = useState(`tai-lieu-${Date.now()}`);
  const [bundleTitle, setBundleTitle] = useState("Combo mới");
  const [bundleSlug, setBundleSlug] = useState(`combo-${Date.now()}`);
  const [childIds, setChildIds] = useState("");
  const [videoTitle, setVideoTitle] = useState("Video bài học");
  const [lastVideoId, setLastVideoId] = useState<string | null>(null);
  const [attachCourseId, setAttachCourseId] = useState("");
  const [attachLessonId, setAttachLessonId] = useState("");
  const [courseLessons, setCourseLessons] = useState<Array<{ id: string; title: string; sectionTitle: string }>>([]);
  const [docUploadId, setDocUploadId] = useState("");

  async function refresh() {
    if (!token) return;
    const [c, d, b] = await Promise.all([
      apiGet<CourseRow[]>("/teacher/courses", token),
      apiGet<DocRow[]>("/teacher/documents", token),
      apiGet<BundleRow[]>("/teacher/bundles", token),
    ]);
    setCourses(c);
    setDocuments(d);
    setBundles(b);
    if (!attachCourseId && c[0]) setAttachCourseId(c[0].id);
    if (!docUploadId && d[0]) setDocUploadId(d[0].id);
  }

  useEffect(() => {
    setTab(tabFromLocation());
  }, []);

  useEffect(() => {
    if (!ready || !token) return;
    refresh().catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, token]);

  useEffect(() => {
    if (!ready || !token || !attachCourseId) {
      setCourseLessons([]);
      setAttachLessonId("");
      return;
    }
    let cancelled = false;
    apiGet<CourseDetail>(`/teacher/courses/${attachCourseId}`, token)
      .then((course) => {
        if (cancelled) return;
        const rows = course.sections.flatMap((section) =>
          section.lessons.map((lesson) => ({
            id: lesson.id,
            title: lesson.title,
            sectionTitle: section.title,
          })),
        );
        setCourseLessons(rows);
        setAttachLessonId((current) => (rows.some((row) => row.id === current) ? current : rows[0]?.id ?? ""));
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, token, attachCourseId]);

  function openTab(next: Tab) {
    setTab(next);
    const url = next === "courses" ? "/teacher" : `/teacher?tab=${next}`;
    window.history.replaceState(null, "", url);
  }

  async function createCourse() {
    if (!token) return;
    setError(null);
    const res = await apiPost<{ course: CourseRow }>("/teacher/courses", {
      title: courseTitle,
      slug: courseSlug,
      description: "Bản nháp khóa học",
      priceMinor: 499000,
    }, token);
    window.location.href = `/teacher/courses/${res.course.id}`;
  }

  async function createDocument() {
    if (!token) return;
    setError(null);
    const res = await apiPost<{ document: DocRow; product: { id: string } }>(
      "/teacher/documents",
      {
        title: docTitle,
        slug: docSlug,
        description: "Tài liệu bán trên cửa hàng",
        priceMinor: 99000,
      },
      token,
    );
    setDocUploadId(res.document.id);
    setMsg(`Đã tạo ${res.document.title}. Hãy tải file ở tab Tải video / AI.`);
    openTab("upload");
    await refresh();
  }

  async function createBundle() {
    if (!token) return;
    setError(null);
    const ids = childIds
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (ids.length === 0) {
      setError("Nhập mã sản phẩm con, cách nhau bằng dấu phẩy.");
      return;
    }
    await apiPost(
      "/teacher/bundles",
      {
        title: bundleTitle,
        slug: bundleSlug,
        type: "MIXED_BUNDLE",
        priceMinor: 799000,
        childProductIds: ids,
        description: "Combo khóa học và tài liệu",
      },
      token,
    );
    setMsg("Đã tạo combo bản nháp");
    await refresh();
  }

  async function submitProduct(productId: string) {
    if (!token) return;
    await apiPost(`/teacher/products/${productId}/submit`, {}, token);
    setMsg("Đã gửi admin duyệt");
    await refresh();
  }

  async function uploadDocumentFile(file: File) {
    if (!token || !docUploadId) return;
    setError(null);
    const session = await apiPost<{
      versionId: string;
      upload: { url: string };
    }>(
      "/documents/upload-sessions",
      {
        documentId: docUploadId,
        filename: file.name,
        contentType: file.type || "application/pdf",
        sizeBytes: file.size,
      },
      token,
    );
    await apiPutBinary(session.upload.url, file, file.type || "application/pdf").catch(() => undefined);
    await apiPost(`/documents/versions/${session.versionId}/complete`, { sizeBytes: file.size }, token);
    setMsg("Đã tải phiên bản tài liệu");
    await refresh();
  }

  if (ready && user && !hasRole(user, ["teacher", "admin"])) {
    return <p className="error">Tài khoản này không có quyền giảng viên.</p>;
  }

  return (
    <section className="u-wrap">
      <div className="page-head">
        <h1>Studio giảng viên</h1>
        <p className="muted">
          Tạo khóa, soạn chương–bài, chọn video để hệ thống tự chỉnh và gắn vào bài. Admin duyệt trước khi lên cửa hàng.
        </p>
      </div>

      <div className="tabs">
        {TABS.map((item) => (
          <button
            key={item.id}
            className={tab === item.id ? "is-on" : undefined}
            type="button"
            onClick={() => openTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && <p className="toast error">{error}</p>}
      {msg && <p className="toast ok">{msg}</p>}

      {tab === "courses" && (
        <>
          <div className="panel" style={{ marginBottom: 24 }}>
            <h2>Tạo khóa học mới</h2>
            <div className="split">
              <div>
                <label>Tiêu đề</label>
                <input value={courseTitle} onChange={(e) => setCourseTitle(e.target.value)} />
                <label>Đường dẫn cửa hàng</label>
                <input value={courseSlug} onChange={(e) => setCourseSlug(e.target.value)} />
                <button type="button" onClick={() => createCourse().catch((e) => setError(e.message))}>
                  Tạo và mở studio
                </button>
              </div>
              <p className="muted">
                Khóa mới bắt đầu ở trạng thái bản nháp, có sẵn Chương 1. Bạn soạn xong rồi gửi duyệt.
              </p>
            </div>
          </div>
          <div className="grid">
            {courses.map((c) => (
              <article className="product" key={c.id}>
                <div className="cover" />
                <div className="type">Khóa học</div>
                <h3>{c.title}</h3>
                <div>
                  <span className={`badge ${statusTone(c.status)}`}>{statusLabel(c.status)}</span>
                  {c.product && (
                    <span className={`badge ${statusTone(c.product.status)}`}>
                      {statusLabel(c.product.status)}
                    </span>
                  )}
                </div>
                <p className="price">{c.product?.prices?.[0] ? formatVnd(c.product.prices[0].amountMinor) : "—"}</p>
                <div className="studio-actions">
                  <a className="btn btn-sm" href={`/teacher/courses/${c.id}`}>
                    Mở studio
                  </a>
                  {c.product?.id && (
                    <button
                      type="button"
                      className="secondary btn-sm"
                      onClick={() => submitProduct(c.product!.id).catch((e) => setError(e.message))}
                    >
                      Gửi duyệt
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {tab === "documents" && (
        <>
          <div className="panel stack" style={{ marginBottom: 24, maxWidth: 520 }}>
            <h2>Tạo tài liệu bán</h2>
            <label>Tiêu đề</label>
            <input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} />
            <label>Đường dẫn</label>
            <input value={docSlug} onChange={(e) => setDocSlug(e.target.value)} />
            <button type="button" onClick={() => createDocument().catch((e) => setError(e.message))}>
              Tạo tài liệu
            </button>
          </div>
          <div className="panel">
            <h2>Tài liệu của tôi</h2>
            <ul className="lesson-list">
              {documents.map((d) => (
                <li key={d.id}>
                  <span>
                    {d.title}{" "}
                    <span className={`badge ${statusTone(d.status)}`}>{statusLabel(d.status)}</span>
                    <div className="muted">Phiên bản {d.versions?.[0]?.version ?? 0}</div>
                  </span>
                  {d.product?.id && (
                    <button
                      type="button"
                      className="secondary btn-sm"
                      onClick={() => submitProduct(d.product!.id).catch((e) => setError(e.message))}
                    >
                      Gửi duyệt
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {tab === "bundles" && (
        <>
          <div className="panel stack" style={{ marginBottom: 24, maxWidth: 560 }}>
            <h2>Tạo combo</h2>
            <label>Tiêu đề</label>
            <input value={bundleTitle} onChange={(e) => setBundleTitle(e.target.value)} />
            <label>Đường dẫn</label>
            <input value={bundleSlug} onChange={(e) => setBundleSlug(e.target.value)} />
            <label>Mã sản phẩm con (cách nhau bằng dấu phẩy)</label>
            <input
              value={childIds}
              onChange={(e) => setChildIds(e.target.value)}
              placeholder="productId1,productId2"
            />
            <button type="button" onClick={() => createBundle().catch((e) => setError(e.message))}>
              Tạo combo
            </button>
          </div>
          <div className="panel">
            <h2>Combo của tôi</h2>
            <ul className="lesson-list">
              {bundles.map((b) => (
                <li key={b.id}>
                  <span>
                    {b.name} <span className="badge">{productTypeLabel(b.type)}</span>{" "}
                    <span className={`badge ${statusTone(b.status)}`}>{statusLabel(b.status)}</span>
                    <div className="muted">{b.prices?.[0] ? formatVnd(b.prices[0].amountMinor) : ""}</div>
                  </span>
                  <button
                    type="button"
                    className="secondary btn-sm"
                    onClick={() => submitProduct(b.id).catch((e) => setError(e.message))}
                  >
                    Gửi duyệt
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {tab === "upload" && (
        <>
        <div className="panel" style={{ maxWidth: 860 }}>
          <h2>Tải video vào bài</h2>
          <p className="muted">
            Chọn khóa, chọn bài, rồi chọn một video để gắn ngay. Kho hàng loạt bên dưới chạy đủ cùng công thức chuyên
            gia; xem lại trên từng hàng rồi Lưu vào bài.
          </p>
          <label>Khóa học</label>
          <select value={attachCourseId} onChange={(e) => setAttachCourseId(e.target.value)}>
            {courses.length === 0 && <option value="">Chưa có khóa</option>}
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          <label>Bài học</label>
          <select value={attachLessonId} onChange={(e) => setAttachLessonId(e.target.value)}>
            {courseLessons.length === 0 && <option value="">Khóa này chưa có bài</option>}
            {courseLessons.map((lesson) => (
              <option key={lesson.id} value={lesson.id}>
                {lesson.sectionTitle} — {lesson.title}
              </option>
            ))}
          </select>
          {attachCourseId && courseLessons.length === 0 && (
            <a className="btn secondary" href={`/teacher/courses/${attachCourseId}#video`}>
              Mở studio để tạo bài trước
            </a>
          )}
          <label>Tiêu đề video (tuỳ chọn)</label>
          <input value={videoTitle} onChange={(e) => setVideoTitle(e.target.value)} />
          {token && (
            <AutoVideoPublish
              token={token}
              courseId={attachCourseId || undefined}
              lessonId={attachLessonId || undefined}
              lessonTitle={courseLessons.find((lesson) => lesson.id === attachLessonId)?.title}
              videoTitle={videoTitle}
              studioHref={attachCourseId ? `/teacher/courses/${attachCourseId}#video` : undefined}
              onReady={(next) => setLastVideoId(next.newVideoId)}
              onDone={(next) => {
                setLastVideoId(next.newVideoId);
                setMsg("Đã lưu video vào bài.");
              }}
            />
          )}
          {lastVideoId && token && (
            <LazyVideoAiEditPanel
              videoId={lastVideoId}
              token={token}
              lessonId={attachLessonId || undefined}
              courseId={attachCourseId || undefined}
              variant="advanced"
              onNewVideoId={setLastVideoId}
            />
          )}
          {attachCourseId && (
            <a className="btn secondary" href={`/teacher/courses/${attachCourseId}#video`}>
              Mở studio bài học
            </a>
          )}

          <h2>Tải file cho tài liệu bán</h2>
          <label>Tài liệu</label>
          <select value={docUploadId} onChange={(e) => setDocUploadId(e.target.value)}>
            {documents.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
          <FileDrop
            accept=".pdf,.png,.jpg,.jpeg,.txt,application/pdf"
            label="Chọn file PDF hoặc ảnh"
            hint="Dùng cho sản phẩm tài liệu trên cửa hàng"
            onFile={(file) => void uploadDocumentFile(file).catch((err) => setError(err.message))}
          />
        </div>
        {token && (
          <div className="panel video-inbox-panel">
            <VideoInbox
              token={token}
              courses={courses.map((course) => ({ id: course.id, title: course.title }))}
              defaultCourseId={attachCourseId || undefined}
              defaultLessonId={attachLessonId || undefined}
              onAssigned={(videoId) => {
                setLastVideoId(videoId);
                setMsg("Đã gắn video từ kho vào bài.");
              }}
            />
          </div>
        )}
        </>
      )}

      {tab === "affiliate" && (
        <div className="panel">
          <h2>Hoa hồng và rút tiền</h2>
          <p className="muted">Quản lý mã giới thiệu, số dư và yêu cầu rút trên trang Affiliate.</p>
          <a className="btn" href="/affiliate">
            Mở bảng affiliate
          </a>
        </div>
      )}
    </section>
  );
}
