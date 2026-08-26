"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { apiDelete, apiGet, apiPatch, apiPost, apiPut, apiPutBinary, formatVnd } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";

type LessonContent = {
  id: string;
  contentType: string;
  body?: string | null;
  refId?: string | null;
};

type Lesson = {
  id: string;
  title: string;
  isPreview: boolean;
  dripDaysAfterPurchase: number | null;
  contents: LessonContent[];
};

type DocBrief = {
  id: string;
  title: string;
  versions?: Array<{ version: number; mime: string }>;
};

type Course = {
  id: string;
  title: string;
  status: string;
  product: {
    id: string;
    slug: string;
    description: string;
    status: string;
    prices?: Array<{ amountMinor: number }>;
  };
  announcements: Array<{ id: string; title: string; body: string }>;
  quizzes: Array<{ id: string; title: string }>;
  sections: Array<{
    id: string;
    title: string;
    lessons: Lesson[];
  }>;
  attachedDocuments?: DocBrief[];
  researchDocuments?: DocBrief[];
};

function inferMime(filename: string, fallback: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    zip: "application/zip",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    mp4: "video/mp4",
    txt: "text/plain",
    md: "text/plain",
  };
  return map[ext] ?? fallback;
}

function lessonDraft(lesson: Lesson) {
  return {
    title: lesson.title,
    isPreview: lesson.isPreview,
    body: lesson.contents.find((c) => c.contentType === "TEXT")?.body ?? "",
    videoId: lesson.contents.find((c) => c.contentType === "VIDEO")?.refId ?? "",
    documentIds: lesson.contents
      .filter((c) => c.contentType === "DOCUMENT" && c.refId)
      .map((c) => String(c.refId)),
  };
}

export default function TeacherCourseStudioPage() {
  const { id } = useParams<{ id: string }>();
  const { token, ready } = useRequireAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [priceMinor, setPriceMinor] = useState("0");

  const [sectionTitle, setSectionTitle] = useState("Chương mới");
  const [lessonTitle, setLessonTitle] = useState("Bài mới");
  const [annTitle, setAnnTitle] = useState("Thông báo mới");
  const [annBody, setAnnBody] = useState("");
  const [quizTitle, setQuizTitle] = useState("Quiz nhanh");
  const [stem, setStem] = useState("Câu hỏi 1?");
  const [dripDays, setDripDays] = useState("1");

  const [editTitle, setEditTitle] = useState("");
  const [editPreview, setEditPreview] = useState(false);
  const [editBody, setEditBody] = useState("");
  const [editVideoId, setEditVideoId] = useState("");
  const [editDocumentIds, setEditDocumentIds] = useState<string[]>([]);

  const selectedLesson = useMemo(() => {
    if (!course || !selectedLessonId) return null;
    return course.sections.flatMap((s) => s.lessons).find((l) => l.id === selectedLessonId) ?? null;
  }, [course, selectedLessonId]);

  const documentCatalog = useMemo(() => {
    const rows = [...(course?.attachedDocuments ?? []), ...(course?.researchDocuments ?? [])];
    const seen = new Set<string>();
    return rows.filter((row) => {
      if (seen.has(row.id)) return false;
      seen.add(row.id);
      return true;
    });
  }, [course]);

  async function load(nextLessonId?: string | null) {
    if (!token) return;
    const data = await apiGet<Course>(`/teacher/courses/${id}`, token);
    setCourse(data);
    setTitle(data.title);
    setSlug(data.product.slug);
    setDescription(data.product.description ?? "");
    setPriceMinor(String(data.product.prices?.[0]?.amountMinor ?? 0));
    const firstLesson = data.sections.flatMap((s) => s.lessons)[0];
    const keep = nextLessonId ?? selectedLessonId ?? firstLesson?.id ?? null;
    const exists = data.sections.flatMap((s) => s.lessons).some((l) => l.id === keep);
    const next = exists ? keep : firstLesson?.id ?? null;
    setSelectedLessonId(next);
    const lesson = data.sections.flatMap((s) => s.lessons).find((l) => l.id === next);
    if (lesson) applyLesson(lesson);
  }

  function applyLesson(lesson: Lesson) {
    const draft = lessonDraft(lesson);
    setEditTitle(draft.title);
    setEditPreview(draft.isPreview);
    setEditBody(draft.body);
    setEditVideoId(draft.videoId);
    setEditDocumentIds(draft.documentIds);
  }

  useEffect(() => {
    if (!ready || !token) return;
    load().catch((e: Error) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, token, id]);

  async function run(action: () => Promise<void>, ok?: string) {
    if (!token) return;
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      await action();
      if (ok) setMsg(ok);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Thao tác thất bại");
    } finally {
      setBusy(false);
    }
  }

  if (!course) return <p className="muted">{error || "Đang tải studio…"}</p>;

  return (
    <section>
      <p>
        <a href="/teacher">← Giảng viên</a>
      </p>
      <h1 style={{ fontFamily: "var(--font-display)", marginBottom: 8 }}>Studio khóa học</h1>
      <p className="muted">
        Soạn chương / bài, viết nội dung, tải video và tài liệu nghiên cứu. Admin duyệt trước khi lên cửa hàng.
      </p>
      <div style={{ margin: "12px 0 20px" }}>
        <span className="badge">{course.status}</span>
        <span className="badge">{course.product.status}</span>
        <span className="badge">{formatVnd(course.product.prices?.[0]?.amountMinor ?? 0)}</span>
      </div>
      {error && <p className="error">{error}</p>}
      {msg && <p className="ok">{msg}</p>}

      <div className="panel" style={{ marginBottom: 20 }}>
        <h2>Thông tin khóa học</h2>
        <label>Tiêu đề</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
        <label>Slug cửa hàng</label>
        <input value={slug} onChange={(e) => setSlug(e.target.value)} />
        <label>Mô tả</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        <label>Giá (đồng)</label>
        <input value={priceMinor} onChange={(e) => setPriceMinor(e.target.value)} inputMode="numeric" />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                if (!token) return;
                const next = await apiPatch<Course>(
                  `/teacher/courses/${course.id}`,
                  {
                    title,
                    slug,
                    description,
                    priceMinor: Number(priceMinor) || 0,
                  },
                  token,
                );
                setCourse(next);
              }, "Đã lưu thông tin khóa học")
            }
          >
            Lưu thông tin
          </button>
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                if (!token) return;
                await apiPost(`/teacher/courses/${course.id}/submit`, {}, token);
                await load(selectedLessonId);
              }, "Đã gửi admin duyệt")
            }
          >
            Gửi duyệt
          </button>
        </div>
      </div>

      <div className="studio-grid">
        <div className="panel">
          <h2>Chương trình</h2>
          <label>Tên chương</label>
          <input value={sectionTitle} onChange={(e) => setSectionTitle(e.target.value)} />
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                if (!token) return;
                const next = await apiPost<Course>(
                  `/teacher/courses/${course.id}/sections`,
                  { title: sectionTitle },
                  token,
                );
                setCourse(next);
              }, "Đã thêm chương")
            }
          >
            Thêm chương
          </button>

          {course.sections.map((section) => (
            <div key={section.id} style={{ marginTop: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <strong>{section.title}</strong>
                <button
                  type="button"
                  className="secondary"
                  disabled={busy}
                  onClick={() => {
                    const nextTitle = window.prompt("Đổi tên chương", section.title);
                    if (!nextTitle?.trim() || !token) return;
                    void run(async () => {
                      const next = await apiPatch<Course>(
                        `/teacher/courses/${course.id}/sections/${section.id}`,
                        { title: nextTitle.trim() },
                        token,
                      );
                      setCourse(next);
                    }, "Đã đổi tên chương");
                  }}
                >
                  Đổi tên
                </button>
              </div>
              <ul className="lesson-list">
                {section.lessons.map((lesson) => (
                  <li key={lesson.id}>
                    <button
                      type="button"
                      className={selectedLessonId === lesson.id ? undefined : "secondary"}
                      onClick={() => {
                        setSelectedLessonId(lesson.id);
                        applyLesson(lesson);
                      }}
                    >
                      {lesson.title}
                      {lesson.isPreview ? " · preview" : ""}
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      disabled={busy}
                      onClick={() => {
                        if (!token || !window.confirm(`Xóa bài “${lesson.title}”?`)) return;
                        void run(async () => {
                          const next = await apiDelete<Course>(
                            `/teacher/courses/${course.id}/lessons/${lesson.id}`,
                            token,
                          );
                          setCourse(next);
                          const fallback = next.sections.flatMap((s) => s.lessons)[0];
                          setSelectedLessonId(fallback?.id ?? null);
                          if (fallback) applyLesson(fallback);
                        }, "Đã xóa bài");
                      }}
                    >
                      Xóa
                    </button>
                  </li>
                ))}
              </ul>
              <label>Bài trong chương này</label>
              <input value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} />
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    if (!token) return;
                    const next = await apiPost<Course>(
                      `/teacher/courses/${course.id}/sections/${section.id}/lessons`,
                      { title: lessonTitle, isPreview: section.lessons.length === 0 },
                      token,
                    );
                    setCourse(next);
                    const created = next.sections
                      .find((s) => s.id === section.id)
                      ?.lessons.slice(-1)[0];
                    if (created) {
                      setSelectedLessonId(created.id);
                      applyLesson(created);
                    }
                  }, "Đã thêm bài")
                }
              >
                Thêm bài
              </button>
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={() => {
                  if (!token || !window.confirm(`Xóa chương “${section.title}” và mọi bài bên trong?`)) return;
                  void run(async () => {
                    const next = await apiDelete<Course>(
                      `/teacher/courses/${course.id}/sections/${section.id}`,
                      token,
                    );
                    setCourse(next);
                    const fallback = next.sections.flatMap((s) => s.lessons)[0];
                    setSelectedLessonId(fallback?.id ?? null);
                    if (fallback) applyLesson(fallback);
                  }, "Đã xóa chương");
                }}
              >
                Xóa chương
              </button>
            </div>
          ))}
        </div>

        <div className="panel">
          <h2>Soạn bài</h2>
          {!selectedLesson && <p className="muted">Thêm một bài học để bắt đầu soạn.</p>}
          {selectedLesson && (
            <>
              <label>Tiêu đề bài</label>
              <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={editPreview}
                  onChange={(e) => setEditPreview(e.target.checked)}
                  style={{ width: "auto", margin: 0 }}
                />
                Bài xem trước miễn phí
              </label>
              <label>Nội dung chữ</label>
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={8}
                placeholder="Giảng giải, ghi chú nghiên cứu, tóm tắt…"
              />
              <label>Video bài học</label>
              <input
                value={editVideoId}
                onChange={(e) => setEditVideoId(e.target.value)}
                placeholder="videoId (tự điền sau khi tải lên)"
              />
              <input
                type="file"
                accept="video/mp4,video/*,application/octet-stream"
                disabled={busy}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file || !token) return;
                  void run(async () => {
                    const session = await apiPost<{ videoId: string; upload: { url: string } }>(
                      "/videos/upload-sessions",
                      {
                        filename: file.name,
                        contentType: file.type || "video/mp4",
                        title: editTitle || file.name,
                      },
                      token,
                    );
                    await apiPutBinary(session.upload.url, file, file.type || "video/mp4").catch(() => undefined);
                    await apiPost(`/videos/${session.videoId}/complete`, { sizeBytes: file.size }, token);
                    setEditVideoId(session.videoId);
                  }, "Đã tải video — nhớ Lưu bài");
                }}
              />

              <h3>Tài liệu nghiên cứu</h3>
              <p className="muted">PDF, Word, PowerPoint, Excel, ảnh hoặc TXT. Học viên mở được khi có quyền học bài này.</p>
              <ul className="lesson-list">
                {editDocumentIds.map((docId) => {
                  const meta = documentCatalog.find((d) => d.id === docId);
                  return (
                    <li key={docId}>
                      <span>
                        {meta?.title ?? docId}
                        {meta?.versions?.[0] ? ` · v${meta.versions[0].version}` : ""}
                      </span>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => setEditDocumentIds((prev) => prev.filter((id) => id !== docId))}
                      >
                        Gỡ
                      </button>
                    </li>
                  );
                })}
              </ul>
              {documentCatalog.filter((d) => !editDocumentIds.includes(d.id)).length > 0 && (
                <>
                  <label>Gắn tài liệu đã có</label>
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      const value = e.target.value;
                      e.target.value = "";
                      if (!value) return;
                      setEditDocumentIds((prev) => (prev.includes(value) ? prev : [...prev, value]));
                    }}
                  >
                    <option value="">Chọn tài liệu…</option>
                    {documentCatalog
                      .filter((d) => !editDocumentIds.includes(d.id))
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.title}
                        </option>
                      ))}
                  </select>
                </>
              )}
              <label>Tải tài liệu mới vào bài này</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.txt,.zip,application/pdf"
                disabled={busy}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file || !token) return;
                  void run(async () => {
                    const created = await apiPost<{ document: { id: string; title: string } }>(
                      `/teacher/courses/${course.id}/documents`,
                      { title: file.name.replace(/\.[^.]+$/, "") || file.name },
                      token,
                    );
                    const session = await apiPost<{ versionId: string; upload: { url: string } }>(
                      "/documents/upload-sessions",
                      {
                        documentId: created.document.id,
                        filename: file.name,
                        contentType: inferMime(file.name, file.type || "application/pdf"),
                        sizeBytes: file.size,
                      },
                      token,
                    );
                    await apiPutBinary(
                      session.upload.url,
                      file,
                      inferMime(file.name, file.type || "application/pdf"),
                    ).catch(() => undefined);
                    await apiPost(`/documents/versions/${session.versionId}/complete`, { sizeBytes: file.size }, token);
                    setEditDocumentIds((prev) =>
                      prev.includes(created.document.id) ? prev : [...prev, created.document.id],
                    );
                    await load(selectedLesson.id);
                  }, "Đã tải tài liệu — nhớ Lưu bài");
                }}
              />

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      if (!token) return;
                      await apiPatch(
                        `/teacher/courses/${course.id}/lessons/${selectedLesson.id}`,
                        { title: editTitle, isPreview: editPreview },
                        token,
                      );
                      const next = await apiPut<Course>(
                        `/teacher/courses/${course.id}/lessons/${selectedLesson.id}/content`,
                        {
                          body: editBody,
                          videoId: editVideoId,
                          documentIds: editDocumentIds,
                        },
                        token,
                      );
                      setCourse(next);
                      const refreshed = next.sections
                        .flatMap((s) => s.lessons)
                        .find((l) => l.id === selectedLesson.id);
                      if (refreshed) applyLesson(refreshed);
                    }, "Đã lưu bài")
                  }
                >
                  Lưu bài
                </button>
                <a className="btn secondary" href={`/learn/${selectedLesson.id}`}>
                  Xem như học viên
                </a>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="panel" style={{ marginTop: 20 }}>
        <h2>Drip</h2>
        <label>Số ngày mở bài trả phí sau khi mua</label>
        <input value={dripDays} onChange={(e) => setDripDays(e.target.value)} />
        <button
          type="button"
          className="secondary"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              if (!token) return;
              const next = await apiPatch<Course>(
                `/teacher/courses/${course.id}/drip`,
                {
                  dripDaysAfterPurchase: Number(dripDays) || 0,
                  setPreviewAsPrerequisite: true,
                },
                token,
              );
              setCourse(next);
            }, "Đã áp dụng drip")
          }
        >
          Áp dụng drip + bài preview làm điều kiện
        </button>
      </div>

      <div className="panel" style={{ marginTop: 20 }}>
        <h2>Thông báo</h2>
        <ul className="lesson-list">
          {course.announcements.map((a) => (
            <li key={a.id}>
              <strong>{a.title}</strong> — {a.body}
            </li>
          ))}
        </ul>
        <input value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} />
        <input value={annBody} onChange={(e) => setAnnBody(e.target.value)} placeholder="Nội dung" />
        <button
          type="button"
          className="secondary"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              if (!token) return;
              await apiPost(
                `/courses/${course.id}/announcements`,
                { courseId: course.id, title: annTitle, body: annBody },
                token,
              );
              await load(selectedLessonId);
            }, "Đã đăng thông báo")
          }
        >
          Đăng thông báo
        </button>
      </div>

      <div className="panel" style={{ marginTop: 20 }}>
        <h2>Quiz</h2>
        <ul className="lesson-list">
          {course.quizzes.map((q) => (
            <li key={q.id}>
              <a href={`/quizzes/${q.id}`}>{q.title}</a>
            </li>
          ))}
        </ul>
        <input value={quizTitle} onChange={(e) => setQuizTitle(e.target.value)} />
        <input value={stem} onChange={(e) => setStem(e.target.value)} />
        <button
          type="button"
          className="secondary"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              if (!token) return;
              await apiPost(
                `/teacher/courses/${course.id}/quizzes`,
                {
                  title: quizTitle,
                  questions: [
                    {
                      stem,
                      answers: [
                        { body: "Đúng", isCorrect: true },
                        { body: "Sai", isCorrect: false },
                      ],
                    },
                  ],
                },
                token,
              );
              await load(selectedLessonId);
            }, "Đã tạo quiz")
          }
        >
          Tạo quiz MCQ
        </button>
      </div>
    </section>
  );
}
