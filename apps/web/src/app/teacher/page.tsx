"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPatch, apiPost, apiPutBinary, formatVnd } from "@/lib/api";
import { hasRole, useRequireAuth } from "@/lib/auth";

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

export default function TeacherPage() {
  const { token, user, ready } = useRequireAuth();
  const [tab, setTab] = useState<"courses" | "documents" | "bundles" | "upload" | "affiliate">("courses");
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [documents, setDocuments] = useState<DocRow[]>([]);
  const [bundles, setBundles] = useState<BundleRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [courseTitle, setCourseTitle] = useState("New Course");
  const [courseSlug, setCourseSlug] = useState(`course-${Date.now()}`);
  const [docTitle, setDocTitle] = useState("New Document");
  const [docSlug, setDocSlug] = useState(`doc-${Date.now()}`);
  const [bundleTitle, setBundleTitle] = useState("New Bundle");
  const [bundleSlug, setBundleSlug] = useState(`bundle-${Date.now()}`);
  const [childIds, setChildIds] = useState("");
  const [videoTitle, setVideoTitle] = useState("Lesson video");
  const [lastVideoId, setLastVideoId] = useState<string | null>(null);
  const [attachCourseId, setAttachCourseId] = useState("");
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
    if (!ready || !token) return;
    refresh().catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, token]);

  async function createCourse() {
    if (!token) return;
    setError(null);
    const res = await apiPost<{ course: CourseRow }>("/teacher/courses", {
      title: courseTitle,
      slug: courseSlug,
      description: "Draft course",
      priceMinor: 19900000,
    }, token);
    await apiPatch(
      `/teacher/courses/${res.course.id}/curriculum`,
      {
        sections: [
          {
            title: "Section 1",
            lessons: [
              { title: "Preview lesson", isPreview: true, body: "Free preview content", key: "preview" },
              {
                title: "Paid lesson",
                isPreview: false,
                body: "Paid lesson body",
                key: "paid",
                prerequisiteKey: "preview",
                dripDaysAfterPurchase: 1,
              },
            ],
          },
        ],
      },
      token,
    );
    setMsg(`Created course ${res.course.title}`);
    await refresh();
  }

  async function createDocument() {
    if (!token) return;
    setError(null);
    const res = await apiPost<{ document: DocRow; product: { id: string } }>(
      "/teacher/documents",
      {
        title: docTitle,
        slug: docSlug,
        description: "Draft document product",
        priceMinor: 9900000,
      },
      token,
    );
    setDocUploadId(res.document.id);
    setMsg(`Created document ${res.document.title} — upload file next`);
    setTab("upload");
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
      setError("Nhập childProductIds (comma-separated product IDs)");
      return;
    }
    await apiPost(
      "/teacher/bundles",
      {
        title: bundleTitle,
        slug: bundleSlug,
        type: "MIXED_BUNDLE",
        priceMinor: 54900000,
        childProductIds: ids,
        description: "Draft bundle",
      },
      token,
    );
    setMsg("Created bundle draft");
    await refresh();
  }

  async function submitProduct(productId: string) {
    if (!token) return;
    await apiPost(`/teacher/products/${productId}/submit`, {}, token);
    setMsg(`Submitted ${productId} for review`);
    await refresh();
  }

  async function uploadVideo(file: File) {
    if (!token) return;
    setError(null);
    const session = await apiPost<{
      videoId: string;
      upload: { url: string };
    }>(
      "/videos/upload-sessions",
      {
        filename: file.name,
        contentType: file.type || "video/mp4",
        title: videoTitle,
      },
      token,
    );
    await apiPutBinary(session.upload.url, file, file.type || "video/mp4").catch(() => {
      // Local memory storage still marks READY via /complete sizeBytes
    });
    await apiPost(`/videos/${session.videoId}/complete`, { sizeBytes: file.size }, token);
    setLastVideoId(session.videoId);
    setMsg(`Video READY: ${session.videoId}`);
  }

  async function attachVideoToCourse() {
    if (!token || !lastVideoId || !attachCourseId) return;
    const ok = window.confirm(
      "Thao tác này sẽ thay thế toàn bộ chương trình khóa học bằng một section video. Tiếp tục?",
    );
    if (!ok) return;
    await apiPatch(
      `/teacher/courses/${attachCourseId}/curriculum`,
      {
        sections: [
          {
            title: "Video section",
            lessons: [
              {
                title: "Preview (text)",
                isPreview: true,
                body: "Free preview",
              },
              {
                title: "Main video lesson",
                isPreview: false,
                body: "Watch the attached video below.",
                videoId: lastVideoId,
              },
            ],
          },
        ],
      },
      token,
    );
    setMsg(`Attached video ${lastVideoId} to course ${attachCourseId}`);
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
    await apiPutBinary(session.upload.url, file, file.type || "application/pdf").catch(() => {
      // Local memory: complete still records size
    });
    await apiPost(`/documents/versions/${session.versionId}/complete`, { sizeBytes: file.size }, token);
    setMsg(`Document version uploaded for ${docUploadId}`);
    await refresh();
  }

  if (ready && user && !hasRole(user, ["teacher", "admin"])) {
    return <p className="error">Tài khoản này không có quyền giảng viên.</p>;
  }

  return (
    <section>
      <h1 style={{ fontFamily: "var(--font-display)" }}>Teacher Portal</h1>
      <p className="muted">teacher@edu.local · tạo course / document / bundle, upload, submit review</p>
      {user && <p>User: {user.email}</p>}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "16px 0" }}>
        {(["courses", "documents", "bundles", "upload", "affiliate"] as const).map((t) => (
          <button
            key={t}
            className={tab === t ? undefined : "secondary"}
            type="button"
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {error && <p className="error">{error}</p>}
      {msg && <p className="ok">{msg}</p>}

      {tab === "courses" && (
        <>
          <div className="panel stack" style={{ marginBottom: 24 }}>
            <label>Title</label>
            <input value={courseTitle} onChange={(e) => setCourseTitle(e.target.value)} />
            <label>Slug</label>
            <input value={courseSlug} onChange={(e) => setCourseSlug(e.target.value)} />
            <button type="button" onClick={() => createCourse().catch((e) => setError(e.message))}>
              Create draft course + curriculum
            </button>
          </div>
          <div className="panel">
            <h2>My courses</h2>
            <ul className="lesson-list">
              {courses.map((c) => (
                <li key={c.id}>
                  <span>
                    {c.title}{" "}
                    <span className="badge">{c.status}</span>{" "}
                    <span className="badge">{c.product?.status}</span>
                    <div className="muted">
                      <a href={`/teacher/courses/${c.id}`}>Sửa curriculum / quiz</a> · course {c.id} ·{" "}
                      {c.product?.prices?.[0] ? formatVnd(c.product.prices[0].amountMinor) : ""}
                    </div>
                  </span>
                  {c.product?.id && (
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => submitProduct(c.product!.id).catch((e) => setError(e.message))}
                    >
                      Submit
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {tab === "documents" && (
        <>
          <div className="panel stack" style={{ marginBottom: 24 }}>
            <label>Title</label>
            <input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} />
            <label>Slug</label>
            <input value={docSlug} onChange={(e) => setDocSlug(e.target.value)} />
            <button type="button" onClick={() => createDocument().catch((e) => setError(e.message))}>
              Create document product
            </button>
          </div>
          <div className="panel">
            <h2>My documents</h2>
            <ul className="lesson-list">
              {documents.map((d) => (
                <li key={d.id}>
                  <span>
                    {d.title} <span className="badge">{d.status}</span>
                    <div className="muted">
                      doc {d.id} · v{d.versions?.[0]?.version ?? 0} · product {d.product?.id}
                    </div>
                  </span>
                  {d.product?.id && (
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => submitProduct(d.product!.id).catch((e) => setError(e.message))}
                    >
                      Submit
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
            <label>Title</label>
            <input value={bundleTitle} onChange={(e) => setBundleTitle(e.target.value)} />
            <label>Slug</label>
            <input value={bundleSlug} onChange={(e) => setBundleSlug(e.target.value)} />
            <label>Child product IDs (comma-separated)</label>
            <input
              value={childIds}
              onChange={(e) => setChildIds(e.target.value)}
              placeholder="productId1,productId2"
            />
            <p className="muted">
              Gợi ý: copy product id từ courses/documents ở trên (chỉ product đã tồn tại).
            </p>
            <button type="button" onClick={() => createBundle().catch((e) => setError(e.message))}>
              Create MIXED_BUNDLE
            </button>
          </div>
          <div className="panel">
            <h2>My bundles</h2>
            <ul className="lesson-list">
              {bundles.map((b) => (
                <li key={b.id}>
                  <span>
                    {b.name} <span className="badge">{b.type}</span>{" "}
                    <span className="badge">{b.status}</span>
                    <div className="muted">
                      {b.id} · {b.prices?.[0] ? formatVnd(b.prices[0].amountMinor) : ""}
                    </div>
                  </span>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => submitProduct(b.id).catch((e) => setError(e.message))}
                  >
                    Submit
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {tab === "upload" && (
        <div className="panel stack" style={{ maxWidth: 560 }}>
          <h2 style={{ fontFamily: "var(--font-display)", marginTop: 0 }}>Video upload</h2>
          <label>Title</label>
          <input value={videoTitle} onChange={(e) => setVideoTitle(e.target.value)} />
          <label>File</label>
          <input
            type="file"
            accept="video/*,application/octet-stream"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadVideo(f).catch((err) => setError(err.message));
            }}
          />
          {lastVideoId && <p className="ok">lastVideoId: {lastVideoId}</p>}
          <label>Attach to course</label>
          <select
            value={attachCourseId}
            onChange={(e) => setAttachCourseId(e.target.value)}
            style={{ width: "100%", padding: 12, marginBottom: 12 }}
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!lastVideoId}
            onClick={() => attachVideoToCourse().catch((e) => setError(e.message))}
          >
            Replace curriculum with video lesson
          </button>

          <h2 style={{ fontFamily: "var(--font-display)" }}>Document file upload</h2>
          <label>Document</label>
          <select
            value={docUploadId}
            onChange={(e) => setDocUploadId(e.target.value)}
            style={{ width: "100%", padding: 12, marginBottom: 12 }}
          >
            {documents.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.txt,application/pdf"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadDocumentFile(f).catch((err) => setError(err.message));
            }}
          />
        </div>
      )}

      {tab === "affiliate" && (
        <div className="panel">
          <h2>Hoa hồng & rút tiền</h2>
          <p className="muted">
            Quản lý mã giới thiệu, số dư và yêu cầu rút trên trang Affiliate.
          </p>
          <a href="/affiliate">Mở bảng affiliate →</a>
        </div>
      )}
    </section>
  );
}
