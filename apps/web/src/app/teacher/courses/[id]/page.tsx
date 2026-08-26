"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { FileDrop } from "@/components/FileDrop";
import { VideoAiEditPanel } from "@/components/VideoAiEditPanel";
import { apiDelete, apiGet, apiPatch, apiPost, apiPut, apiPutBinary, formatVnd } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";
import { statusLabel, statusTone } from "@/lib/labels";

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

type StudioTab = "lesson" | "settings" | "announce" | "quiz";

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
  const [tab, setTab] = useState<StudioTab>("lesson");
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

  const lessonCount = course?.sections.reduce((sum, section) => sum + section.lessons.length, 0) ?? 0;

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

  useEffect(() => {
    if (typeof window === "undefined" || window.location.hash !== "#video") return;
    const node = document.getElementById("video-studio");
    if (!node) return;
    node.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedLesson, course]);

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

  if (!course) {
    return <p className="muted" style={{ padding: 24 }}>{error || "Đang mở studio…"}</p>;
  }

  return (
    <div className="studio-app">
      <div className="studio-topbar">
        <div>
          <a href="/teacher">← Studio</a>
          <h1>{course.title}</h1>
          <div>
            <span className={`badge ${statusTone(course.status)}`}>{statusLabel(course.status)}</span>
            <span className={`badge ${statusTone(course.product.status)}`}>{statusLabel(course.product.status)}</span>
            <span className="badge">{formatVnd(course.product.prices?.[0]?.amountMinor ?? 0)}</span>
            <span className="muted">{course.sections.length} chương · {lessonCount} bài</span>
          </div>
        </div>
        <div className="studio-actions">
          <div className="tabs" style={{ margin: 0 }}>
            {(
              [
                ["lesson", "Soạn bài"],
                ["settings", "Cài đặt"],
                ["announce", "Thông báo"],
                ["quiz", "Quiz"],
              ] as const
            ).map(([key, label]) => (
              <button key={key} type="button" className={tab === key ? "is-on" : undefined} onClick={() => setTab(key)}>
                {label}
              </button>
            ))}
          </div>
          {selectedLesson && (
            <a className="btn secondary btn-sm" href={`/learn/${selectedLesson.id}`}>
              Xem như học viên
            </a>
          )}
          <button
            type="button"
            className="btn-sm"
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

      <div className="studio-body">
        <aside className="studio-outline">
          <div className="outline-head">
            <strong>Chương trình</strong>
          </div>
          <p className="muted">Thêm chương bên trái, soạn bài ở giữa — giống cách Thinkific/Teachable tổ chức giáo trình.</p>
          {course.sections.map((section, index) => (
            <div key={section.id} className="outline-section">
              <div className="outline-head">
                <strong>
                  {index + 1}. {section.title}
                </strong>
                <div className="studio-actions">
                  <button
                    type="button"
                    className="ghost btn-sm"
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
                    Sửa
                  </button>
                  <button
                    type="button"
                    className="ghost btn-sm"
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
                    Xóa
                  </button>
                </div>
              </div>
              {section.lessons.map((lesson) => (
                <div key={lesson.id} style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <button
                    type="button"
                    className={`outline-lesson${selectedLessonId === lesson.id ? " is-active" : ""}`}
                    onClick={() => {
                      setSelectedLessonId(lesson.id);
                      applyLesson(lesson);
                      setTab("lesson");
                    }}
                  >
                    <span>{lesson.title}</span>
                    {lesson.isPreview ? <span className="badge free">Preview</span> : null}
                  </button>
                  <button
                    type="button"
                    className="ghost btn-sm"
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
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="secondary btn-sm"
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
                    const created = next.sections.find((s) => s.id === section.id)?.lessons.slice(-1)[0];
                    if (created) {
                      setSelectedLessonId(created.id);
                      applyLesson(created);
                      setTab("lesson");
                    }
                  }, "Đã thêm bài")
                }
              >
                + Thêm bài
              </button>
            </div>
          ))}
          <label>Tên chương mới</label>
          <input value={sectionTitle} onChange={(e) => setSectionTitle(e.target.value)} />
          <label>Tên bài mặc định</label>
          <input value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} />
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
        </aside>

        <section className="studio-editor">
          {error && <p className="toast error">{error}</p>}
          {msg && <p className="toast ok">{msg}</p>}

          {tab === "lesson" && (
            <>
              {!selectedLesson && (
                <div className="panel">
                  <h2>Chưa có bài nào</h2>
                  <p className="muted">Thêm bài ở cột trái. Bài đầu mỗi chương mặc định là xem trước miễn phí.</p>
                </div>
              )}
              {selectedLesson && (
                <>
                  <label>Tiêu đề bài</label>
                  <input
                    className="editor-title"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                  />
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={editPreview}
                      onChange={(e) => setEditPreview(e.target.checked)}
                    />
                    Bài xem trước miễn phí — học viên vào được trước khi mua
                  </label>

                  <div className="block">
                    <h3>1. Nội dung chữ</h3>
                    <textarea
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      rows={10}
                      placeholder="Giảng giải, ghi chú nghiên cứu, tóm tắt…"
                    />
                  </div>

                  <div className="block" id="video-studio">
                    <h3>2. Tải video khóa học &amp; chỉnh sửa AI</h3>
                    <p className="muted">
                      Kéo video vào ô dưới. Studio AI hiện ngay sau khi tải xong. Nhớ bấm Lưu bài để gắn video vào bài học.
                    </p>
                    <input
                      value={editVideoId}
                      onChange={(e) => setEditVideoId(e.target.value)}
                      placeholder="Mã video (tự điền sau khi tải)"
                    />
                    <FileDrop
                      accept="video/mp4,video/*,application/octet-stream"
                      disabled={busy}
                      label="Kéo thả hoặc chọn video"
                      hint="MP4 khuyến nghị"
                      onFile={(file) => {
                        if (!token) return;
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
                        }, "Đã tải video — mở chỉnh AI bên dưới rồi nhớ Lưu bài");
                      }}
                    />
                    {!editVideoId && (
                      <p className="note-box">
                        Chưa có video trên bài này. Tải file MP4 ở trên — bảng công cụ AI (nâng chất, giọng nói, PIP
                        toon, bản minh họa) sẽ mở ngay bên dưới.
                      </p>
                    )}
                    {editVideoId && token && (
                      <VideoAiEditPanel
                        videoId={editVideoId}
                        token={token}
                        lessonId={selectedLesson.id}
                        courseId={course.id}
                        onNewVideoId={(id) => setEditVideoId(id)}
                        onCopy={(copy) => {
                          setEditTitle(copy.title);
                          setEditBody((current) => current.trim() || copy.description);
                        }}
                      />
                    )}
                  </div>

                  <div className="block">
                    <h3>3. Tài liệu nghiên cứu</h3>
                    <p className="muted">PDF, Word, PowerPoint, Excel, ảnh hoặc TXT. Học viên mở khi có quyền học bài này.</p>
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
                              className="ghost btn-sm"
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
                    <FileDrop
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.txt,.zip,application/pdf"
                      disabled={busy}
                      label="Tải tài liệu mới vào bài này"
                      hint="File sẽ được gắn ngay sau khi tải xong"
                      onFile={(file) => {
                        if (!token) return;
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
                          const nextIds = editDocumentIds.includes(created.document.id)
                            ? editDocumentIds
                            : [...editDocumentIds, created.document.id];
                          setEditDocumentIds(nextIds);
                          await apiPatch(
                            `/teacher/courses/${course.id}/lessons/${selectedLesson.id}`,
                            { title: editTitle, isPreview: editPreview },
                            token,
                          );
                          await apiPut(
                            `/teacher/courses/${course.id}/lessons/${selectedLesson.id}/content`,
                            {
                              body: editBody,
                              videoId: editVideoId,
                              documentIds: nextIds,
                            },
                            token,
                          );
                          await load(selectedLesson.id);
                        }, "Đã tải và gắn tài liệu vào bài");
                      }}
                    />
                  </div>

                  <div className="studio-actions">
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
                      {busy ? "Đang lưu…" : "Lưu bài"}
                    </button>
                    <a className="btn secondary" href={`/learn/${selectedLesson.id}`}>
                      Xem như học viên
                    </a>
                  </div>
                </>
              )}
            </>
          )}

          {tab === "settings" && (
            <div className="panel">
              <h2>Cài đặt khóa học</h2>
              <label>Tiêu đề</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} />
              <label>Đường dẫn cửa hàng</label>
              <input value={slug} onChange={(e) => setSlug(e.target.value)} />
              <label>Mô tả</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
              <label>Giá (đồng)</label>
              <input value={priceMinor} onChange={(e) => setPriceMinor(e.target.value)} inputMode="numeric" />
              <div className="studio-actions">
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
                  Lưu cài đặt
                </button>
              </div>
              <hr style={{ border: 0, borderTop: "1px solid var(--line)", margin: "24px 0" }} />
              <h3>Mở dần bài học (drip)</h3>
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
          )}

          {tab === "announce" && (
            <div className="panel">
              <h2>Thông báo cho học viên</h2>
              <ul className="lesson-list">
                {course.announcements.map((a) => (
                  <li key={a.id}>
                    <span>
                      <strong>{a.title}</strong>
                      <div className="muted">{a.body}</div>
                    </span>
                  </li>
                ))}
              </ul>
              <input value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} />
              <textarea value={annBody} onChange={(e) => setAnnBody(e.target.value)} placeholder="Nội dung" rows={3} />
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
          )}

          {tab === "quiz" && (
            <div className="panel">
              <h2>Quiz nhanh</h2>
              <ul className="lesson-list">
                {course.quizzes.map((q) => (
                  <li key={q.id}>
                    <a href={`/quizzes/${q.id}`}>{q.title}</a>
                  </li>
                ))}
              </ul>
              <label>Tên quiz</label>
              <input value={quizTitle} onChange={(e) => setQuizTitle(e.target.value)} />
              <label>Câu hỏi</label>
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
                Tạo quiz đúng/sai
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
