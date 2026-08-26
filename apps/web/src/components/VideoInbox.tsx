"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FileDrop } from "@/components/FileDrop";
import { LectureRecipeProgress } from "@/components/LectureRecipeProgress";
import { VideoQuickAdjust } from "@/components/VideoQuickAdjust";
import { ApiError, apiGet, apiPost, apiPutBinaryProgress, isBusyError } from "@/lib/api";
import { PIPELINE_STEPS, pipelineStepById, type RecipeRow } from "@/lib/lecture-recipe";

const MAX_UPLOAD_BYTES = 400 * 1024 * 1024;
const MAX_PARALLEL = 2;

type CourseRow = { id: string; title: string };
type CourseDetail = {
  id: string;
  title: string;
  sections: Array<{ id: string; title: string; lessons: Array<{ id: string; title: string }> }>;
};
type LessonOpt = { id: string; title: string; sectionTitle: string };

type LibraryEdit = {
  id: string;
  status: "QUEUED" | "PROCESSING" | "READY" | "FAILED";
  error: string | null;
  previewUrl: string | null;
  progress?: number;
  step?: string;
  stepLabel?: string;
  output?: {
    durationMs?: number;
    newVideoId?: string;
    recipeId?: string;
    autoApplyError?: string;
    appliedAt?: string;
    techniques?: RecipeRow[];
  } | null;
};

type LibraryItem = {
  id: string;
  title: string;
  status: string;
  durationMs?: number | null;
  createdAt: string;
  thumbnailUrl: string | null;
  inbox: boolean;
  assigned: { lessonId: string; lessonTitle: string; courseId: string; courseTitle: string } | null;
  edit: LibraryEdit | null;
};

type RowTarget = { courseId: string; lessonId: string };

type QueueRow = {
  localId: string;
  videoId?: string;
  name: string;
  phase: "queued" | "upload" | "prepare" | "ready" | "failed";
  progress: number;
  stepId?: string;
  label: string;
  techniques?: RecipeRow[];
  error?: string;
};

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function friendlyError(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) {
    if (/Throttler|Too Many Requests/i.test(err.message)) {
      return "Đang có nhiều thao tác. Đợi vài giây rồi thử lại — không cần chọn lại video.";
    }
    return err.message;
  }
  return "Không tải được video";
}

async function withThrottleRetry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
  let last: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      const throttled =
        (err instanceof ApiError && err.status === 429) ||
        (err instanceof Error && /Throttler|Too Many Requests|quá nhiều lệnh/i.test(err.message));
      if (throttled && attempt < attempts - 1) {
        await wait(2000 * 2 ** attempt);
        continue;
      }
      throw err;
    }
  }
  throw last instanceof Error ? last : new Error("Đang có nhiều thao tác. Đợi vài giây rồi thử lại — không cần chọn lại video.");
}

function flattenLessons(course: CourseDetail): LessonOpt[] {
  return course.sections.flatMap((section) =>
    section.lessons.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      sectionTitle: section.title,
    })),
  );
}

export function VideoInbox(props: {
  token: string;
  courses: CourseRow[];
  defaultCourseId?: string;
  defaultLessonId?: string;
  onAssigned?: (videoId: string) => void;
}) {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [courseId, setCourseId] = useState(props.defaultCourseId ?? "");
  const [lessonId, setLessonId] = useState(props.defaultLessonId ?? "");
  const [lessons, setLessons] = useState<LessonOpt[]>([]);
  const [lessonsByCourse, setLessonsByCourse] = useState<Record<string, LessonOpt[]>>({});
  const [rowTarget, setRowTarget] = useState<Record<string, RowTarget>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [brokenThumbs, setBrokenThumbs] = useState<Record<string, boolean>>({});
  const [showAssigned, setShowAssigned] = useState(false);
  const filesRef = useRef(new Map<string, File>());
  const runningRef = useRef(new Set<string>());

  const inboxItems = useMemo(() => items.filter((row) => row.inbox), [items]);
  const assignedItems = useMemo(() => items.filter((row) => !row.inbox), [items]);
  const visibleItems = showAssigned ? [...inboxItems, ...assignedItems] : inboxItems;
  const inboxCount = inboxItems.length;
  const libraryIds = useMemo(() => new Set(items.map((row) => row.id)), [items]);
  const visibleQueue = useMemo(
    () => queue.filter((row) => !row.videoId || !libraryIds.has(row.videoId)),
    [queue, libraryIds],
  );

  const shouldPoll = items.some((row) => row.edit?.status === "QUEUED" || row.edit?.status === "PROCESSING")
    || queue.some((row) => row.phase === "upload" || row.phase === "prepare");

  async function refreshLibrary(attempt = 0) {
    try {
      const next = await apiGet<{ videos: LibraryItem[] }>("/videos/library", props.token);
      setItems(next.videos);
    } catch (err) {
      const unauthorized =
        (err instanceof ApiError && err.status === 401) ||
        (err instanceof Error && /Unauthorized/i.test(err.message));
      if (unauthorized && attempt < 2) {
        await wait(500 * (attempt + 1));
        return refreshLibrary(attempt + 1);
      }
      throw err;
    }
  }

  useEffect(() => {
    refreshLibrary().catch((err) => {
      if (!isBusyError(err)) setError(friendlyError(err));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.token]);

  useEffect(() => {
    if (!shouldPoll) return;
    const timer = window.setInterval(() => {
      refreshLibrary().catch(() => undefined);
    }, 3500);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldPoll, props.token]);

  useEffect(() => {
    if (courseId) return;
    const next = props.defaultCourseId || props.courses[0]?.id;
    if (next) setCourseId(next);
  }, [props.defaultCourseId, props.courses, courseId]);

  useEffect(() => {
    if (!courseId) {
      setLessons([]);
      setLessonId("");
      return;
    }
    let cancelled = false;
    apiGet<CourseDetail>(`/teacher/courses/${courseId}`, props.token)
      .then((course) => {
        if (cancelled) return;
        const rows = flattenLessons(course);
        setLessons(rows);
        setLessonsByCourse((current) => ({ ...current, [courseId]: rows }));
        setLessonId((current) => (rows.some((row) => row.id === current) ? current : rows[0]?.id ?? ""));
      })
      .catch((err: Error) => {
        if (!cancelled && !isBusyError(err)) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [courseId, props.token]);

  useEffect(() => {
    setRowTarget((current) => {
      let changed = false;
      const next = { ...current };
      for (const item of items) {
        if (next[item.id]) continue;
        next[item.id] = {
          courseId: item.assigned?.courseId || courseId,
          lessonId: item.assigned?.lessonId || (item.assigned ? "" : lessonId),
        };
        changed = true;
      }
      return changed ? next : current;
    });
  }, [items, courseId, lessonId]);

  useEffect(() => {
    setRowTarget((current) => {
      let changed = false;
      const next = { ...current };
      for (const [id, target] of Object.entries(current)) {
        const list = lessonsByCourse[target.courseId];
        if (!list?.length) continue;
        if (!target.lessonId || !list.some((row) => row.id === target.lessonId)) {
          next[id] = { ...target, lessonId: list[0]?.id ?? "" };
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [lessonsByCourse]);

  useEffect(() => {
    const needed = new Set<string>();
    for (const target of Object.values(rowTarget)) {
      if (target.courseId && !lessonsByCourse[target.courseId]) needed.add(target.courseId);
    }
    if (needed.size === 0) return;
    let cancelled = false;
    void Promise.all(
      [...needed].map(async (id) => {
        const course = await apiGet<CourseDetail>(`/teacher/courses/${id}`, props.token);
        return [id, flattenLessons(course)] as const;
      }),
    )
      .then((rows) => {
        if (cancelled) return;
        setLessonsByCourse((current) => {
          const next = { ...current };
          for (const [id, list] of rows) next[id] = list;
          return next;
        });
      })
      .catch((err: Error) => {
        if (!cancelled && !isBusyError(err)) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [rowTarget, lessonsByCourse, props.token]);

  function patchQueue(localId: string, next: Partial<QueueRow>) {
    setQueue((rows) => rows.map((row) => (row.localId === localId ? { ...row, ...next } : row)));
  }

  function applyEditToQueue(localId: string, edit: LibraryEdit) {
    const nextProgress = edit.progress;
    const step = pipelineStepById(edit.step);
    const label = edit.stepLabel || step?.label || "Đang chỉnh";
    patchQueue(localId, {
      phase: edit.status === "FAILED" ? "failed" : edit.status === "READY" ? "ready" : "prepare",
      progress: typeof nextProgress === "number" ? Math.max(0, Math.min(100, Math.round(nextProgress))) : step?.percent,
      stepId: edit.step ?? step?.id,
      label,
      techniques: edit.output?.techniques,
      error: edit.status === "FAILED" ? edit.error || "Không chỉnh được video" : undefined,
    });
  }

  async function pollEdit(localId: string, videoId: string, editId: string): Promise<LibraryEdit> {
    const deadline = Date.now() + 15 * 60 * 1000;
    let last: LibraryEdit | null = null;
    while (Date.now() < deadline) {
      const edit = await withThrottleRetry(() =>
        apiGet<LibraryEdit>(`/videos/${videoId}/ai/edits/${editId}`, props.token),
      );
      last = edit;
      applyEditToQueue(localId, edit);
      if (edit.status === "FAILED" || edit.status === "READY") return edit;
      await wait(3500);
    }
    throw new Error(last ? "Chỉnh video quá lâu. Thử lại với file ngắn hơn." : "Không đọc được tiến trình.");
  }

  async function processFile(file: File, localId: string) {
    patchQueue(localId, { phase: "upload", progress: 4, stepId: "upload", label: PIPELINE_STEPS[0].label });
    const session = await apiPost<{ videoId: string; upload: { url: string } }>(
      "/videos/upload-sessions",
      {
        filename: file.name,
        contentType: file.type || "video/mp4",
        title: file.name.replace(/\.[^.]+$/, "") || "Video bài học",
      },
      props.token,
    );
    patchQueue(localId, { videoId: session.videoId });
    await apiPutBinaryProgress(session.upload.url, file, file.type || "video/mp4", (ratio) => {
      patchQueue(localId, {
        progress: Math.max(4, Math.round(ratio * 8)),
        stepId: "upload",
        label: PIPELINE_STEPS[0].label,
      });
    });
    await apiPost(`/videos/${session.videoId}/complete`, { sizeBytes: file.size }, props.token, { retry429: true });
    patchQueue(localId, { phase: "prepare", progress: 12, stepId: "queue", label: PIPELINE_STEPS[1].label });
    const started = await withThrottleRetry(
      () => apiPost<LibraryEdit>(`/videos/${session.videoId}/ai/prepare`, {}, props.token, { retry429: true }),
      5,
    );
    applyEditToQueue(localId, started);
    await refreshLibrary().catch(() => undefined);
    const edit = await pollEdit(localId, session.videoId, started.id);
    if (edit.status === "FAILED") {
      throw new Error(edit.error || "Không chỉnh được video");
    }
    patchQueue(localId, {
      phase: "ready",
      progress: 100,
      stepId: "done",
      label: PIPELINE_STEPS[PIPELINE_STEPS.length - 1].label,
      techniques: edit.output?.techniques,
    });
    await refreshLibrary();
  }

  useEffect(() => {
    const pending = queue.filter((row) => row.phase === "queued" && !runningRef.current.has(row.localId));
    const slots = MAX_PARALLEL - runningRef.current.size;
    if (pending.length === 0 || slots <= 0) return;
    for (const row of pending.slice(0, slots)) {
      const file = filesRef.current.get(row.localId);
      if (!file) continue;
      runningRef.current.add(row.localId);
      void processFile(file, row.localId)
        .catch((err) => {
          setQueue((rows) =>
            rows.map((item) =>
              item.localId === row.localId
                ? { ...item, phase: "failed", error: friendlyError(err), label: "Lỗi" }
                : item,
            ),
          );
        })
        .finally(() => {
          runningRef.current.delete(row.localId);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue]);

  function enqueue(files: File[]) {
    setError(null);
    setMsg(null);
    const accepted: QueueRow[] = [];
    for (const file of files) {
      if (file.size < 1024) {
        setError("Có file quá nhỏ hoặc trống.");
        continue;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        setError("Có video quá lớn (tối đa 400MB).");
        continue;
      }
      const localId = `${Date.now()}-${file.name}-${Math.random().toString(36).slice(2, 7)}`;
      filesRef.current.set(localId, file);
      accepted.push({
        localId,
        name: file.name,
        phase: "queued",
        progress: 0,
        stepId: "upload",
        label: "Chờ trong hàng — cùng công thức chuyên gia như tải 1 video",
      });
    }
    if (accepted.length) setQueue((rows) => [...rows, ...accepted]);
  }

  function setRowCourse(videoId: string, nextCourseId: string) {
    const nextLessons = lessonsByCourse[nextCourseId] ?? [];
    setRowTarget((current) => ({
      ...current,
      [videoId]: {
        courseId: nextCourseId,
        lessonId: nextLessons[0]?.id ?? "",
      },
    }));
  }

  function setRowLesson(videoId: string, nextLessonId: string) {
    setRowTarget((current) => ({
      ...current,
      [videoId]: {
        courseId: current[videoId]?.courseId || courseId,
        lessonId: nextLessonId,
      },
    }));
  }

  function applyDefaultToInbox() {
    if (!courseId || !lessonId) {
      setError("Chọn khóa và bài mặc định phía trên trước.");
      return;
    }
    setRowTarget((current) => {
      const next = { ...current };
      for (const item of inboxItems) {
        next[item.id] = { courseId, lessonId };
      }
      return next;
    });
    setMsg("Đã áp khóa/bài mặc định cho các hàng chưa gắn.");
  }

  async function saveRow(videoId: string) {
    const target = rowTarget[videoId];
    if (!target?.lessonId) {
      setError("Chọn bài học ngay trên hàng này rồi bấm Lưu.");
      return;
    }
    const rowLessons = lessonsByCourse[target.courseId] ?? (target.courseId === courseId ? lessons : []);
    const lessonTitle = rowLessons.find((row) => row.id === target.lessonId)?.title;
    setBusyId(videoId);
    setError(null);
    try {
      await withThrottleRetry(() =>
        apiPost(`/videos/${videoId}/assign`, { lessonId: target.lessonId, courseId: target.courseId }, props.token, {
          retry429: true,
        }),
      );
      setMsg(`Đã lưu vào bài${lessonTitle ? `: ${lessonTitle}` : ""}.`);
      props.onAssigned?.(videoId);
      await refreshLibrary();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="video-inbox">
      <h2>Kho video hàng loạt</h2>
      <p className="muted">
        Tải nhiều video một lúc. Mỗi file chạy công thức trên máy: làm nét, lọc tiếng, cắt im lặng, tô đậm người giữa
        khung, ảnh bìa và phụ đề. Không đổi tóc/áo như video AI 3D trên YouTube. Khi xong, xem trên hàng, chọn bài rồi
        bấm Lưu.
      </p>
      <FileDrop
        accept="video/mp4,video/*,application/octet-stream"
        multiple
        disabled={queue.length >= 40}
        label="Chọn nhiều video vào kho"
        hint="Chọn hàng loạt. Mỗi video xếp hàng tô đậm trên máy. Tối đa 2 video đang tô cùng lúc, các video khác chờ. Gắn bài trên từng hàng sau khi xem lại."
        onFile={(file) => enqueue([file])}
        onFiles={(files) => enqueue(files)}
      />
      <p className="muted auto-publish-legal">
        Chỉ dùng video bạn sở hữu. Đổi phong cách hay giảm nhạc nền không xóa bản quyền nội dung người khác.
      </p>
      <div className="video-inbox-defaults">
        <label>
          Mặc định khóa cho hàng mới
          <select value={courseId} onChange={(event) => setCourseId(event.target.value)}>
            {props.courses.length === 0 && <option value="">Chưa có khóa</option>}
            {props.courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Mặc định bài cho hàng mới
          <select value={lessonId} onChange={(event) => setLessonId(event.target.value)}>
            {lessons.length === 0 && <option value="">Khóa này chưa có bài</option>}
            {lessons.map((lesson) => (
              <option key={lesson.id} value={lesson.id}>
                {lesson.sectionTitle} — {lesson.title}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="secondary btn-sm" onClick={applyDefaultToInbox} disabled={!lessonId || inboxCount === 0}>
          Áp mặc định cho hàng chưa gắn
        </button>
      </div>
      <p className="muted">
        Trong kho chưa gắn: <strong>{inboxCount}</strong>
        {assignedItems.length > 0 && (
          <>
            {" "}
            · đã gắn {assignedItems.length}{" "}
            <button type="button" className="secondary btn-sm" onClick={() => setShowAssigned((current) => !current)}>
              {showAssigned ? "Ẩn video đã gắn" : "Hiện video đã gắn"}
            </button>
          </>
        )}
      </p>
      {visibleQueue.length > 0 && (
        <ul className="video-inbox-queue">
          {visibleQueue.map((row) => (
            <li key={row.localId}>
              <div className="video-inbox-identity">
                <strong title={row.name}>{row.name}</strong>
                <span className="muted">{row.phase === "failed" ? "Lỗi" : "Đang phân tích đủ như tải 1 video"}</span>
                {row.error && <small className="error">{row.error}</small>}
              </div>
              {row.phase !== "failed" && (
                <LectureRecipeProgress
                  compact
                  hideApply
                  currentStep={row.stepId}
                  progress={row.progress}
                  stepLabel={row.label}
                  techniques={row.techniques}
                />
              )}
            </li>
          ))}
        </ul>
      )}
      {items.length === 0 && visibleQueue.length === 0 && <p className="muted">Chưa có video trong kho. Chọn file phía trên.</p>}
      {items.length > 0 && visibleItems.length === 0 && visibleQueue.length === 0 && (
        <p className="muted">Không còn video chưa gắn. Bấm Hiện video đã gắn nếu muốn chỉnh lại.</p>
      )}
      {visibleItems.length > 0 && (
        <div className="video-inbox-table">
          <div className="video-inbox-head" aria-hidden="true">
            <span>Video</span>
            <span>Xem lại và thông số sau AI</span>
            <span>Gắn vào bài</span>
            <span>Lưu</span>
          </div>
          <ul className="video-inbox-list">
            {visibleItems.map((item) => {
              const editReady = item.edit?.status === "READY";
              const processing = item.edit?.status === "QUEUED" || item.edit?.status === "PROCESSING";
              const target = rowTarget[item.id] ?? { courseId, lessonId };
              const rowLessons = lessonsByCourse[target.courseId] ?? (target.courseId === courseId ? lessons : []);
              return (
                <li key={item.id} className={item.inbox ? "is-inbox" : "is-assigned"}>
                  <div className="video-inbox-identity">
                    {item.thumbnailUrl && !brokenThumbs[item.id] && (
                      <img
                        src={item.thumbnailUrl}
                        alt=""
                        loading="lazy"
                        onError={() => setBrokenThumbs((current) => ({ ...current, [item.id]: true }))}
                      />
                    )}
                    <strong title={item.title}>{item.title}</strong>
                    <span className="muted">
                      {item.inbox ? "Chưa gắn bài" : `Đã gắn: ${item.assigned?.courseTitle} — ${item.assigned?.lessonTitle}`}
                    </span>
                    {item.edit?.status === "FAILED" && <small className="error">{item.edit.error || "Lỗi AI"}</small>}
                  </div>
                  <div className="video-inbox-preview">
                    {processing && (
                      <LectureRecipeProgress
                        compact
                        hideApply
                        currentStep={item.edit?.step}
                        progress={item.edit?.progress}
                        stepLabel={item.edit?.stepLabel}
                        techniques={item.edit?.output?.techniques}
                      />
                    )}
                    {editReady && (
                      <VideoQuickAdjust
                        variant="row"
                        token={props.token}
                        videoId={item.id}
                        durationMs={item.edit?.output?.durationMs ?? item.durationMs ?? undefined}
                        previewUrl={item.edit?.previewUrl}
                        onPreviewError={() => void refreshLibrary().catch(() => undefined)}
                        onUpdated={() => void refreshLibrary()}
                      />
                    )}
                    {!processing && !editReady && item.edit?.status !== "FAILED" && (
                      <p className="muted">Chưa có bản AI. Đợi hàng tải xong.</p>
                    )}
                  </div>
                  <div className="video-inbox-assign-cell">
                    <label>
                      Khóa
                      <select
                        value={target.courseId}
                        disabled={processing || busyId === item.id}
                        onChange={(event) => setRowCourse(item.id, event.target.value)}
                      >
                        {props.courses.length === 0 && <option value="">Chưa có khóa</option>}
                        {props.courses.map((course) => (
                          <option key={course.id} value={course.id}>
                            {course.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Bài học
                      <select
                        value={target.lessonId}
                        disabled={processing || busyId === item.id || rowLessons.length === 0}
                        onChange={(event) => setRowLesson(item.id, event.target.value)}
                      >
                        {rowLessons.length === 0 && <option value="">Khóa này chưa có bài</option>}
                        {rowLessons.map((lesson) => (
                          <option key={lesson.id} value={lesson.id}>
                            {lesson.sectionTitle} — {lesson.title}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="video-inbox-save">
                    <button
                      type="button"
                      className="btn-sm"
                      disabled={!target.lessonId || busyId === item.id || processing}
                      onClick={() => void saveRow(item.id)}
                    >
                      {busyId === item.id ? "Đang lưu…" : "Lưu"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {msg && <p className="ok">{msg}</p>}
      {error && <p className="toast error">{error}</p>}
    </div>
  );
}
