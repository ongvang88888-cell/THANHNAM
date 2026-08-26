"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FileDrop } from "@/components/FileDrop";
import { VideoQuickAdjust } from "@/components/VideoQuickAdjust";
import { ApiError, apiGet, apiPost, apiPutBinaryProgress } from "@/lib/api";

const MAX_UPLOAD_BYTES = 400 * 1024 * 1024;
const MAX_PARALLEL = 2;

type CourseRow = { id: string; title: string };
type CourseDetail = {
  id: string;
  title: string;
  sections: Array<{ id: string; title: string; lessons: Array<{ id: string; title: string }> }>;
};

type LibraryEdit = {
  id: string;
  status: "QUEUED" | "PROCESSING" | "READY" | "FAILED";
  error: string | null;
  previewUrl: string | null;
  progress?: number;
  stepLabel?: string;
  output?: {
    durationMs?: number;
    newVideoId?: string;
    recipeId?: string;
    autoApplyError?: string;
    appliedAt?: string;
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

type QueueRow = {
  localId: string;
  name: string;
  phase: "queued" | "upload" | "prepare" | "ready" | "failed";
  progress: number;
  label: string;
  error?: string;
};

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function friendlyError(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) {
    if (/Throttler|Too Many Requests/i.test(err.message)) {
      return "Hệ thống đang bận. Đợi khoảng 20 giây rồi chọn lại video.";
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
  throw last instanceof Error ? last : new Error("Hệ thống đang bận.");
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
  const [lessons, setLessons] = useState<Array<{ id: string; title: string; sectionTitle: string }>>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openAdjust, setOpenAdjust] = useState<string | null>(null);
  const filesRef = useRef(new Map<string, File>());
  const runningRef = useRef(new Set<string>());

  const inboxCount = items.filter((row) => row.inbox).length;

  async function refreshLibrary() {
    const next = await apiGet<{ videos: LibraryItem[] }>("/videos/library", props.token);
    setItems(next.videos);
  }

  useEffect(() => {
    refreshLibrary().catch((err) => setError(friendlyError(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.token]);

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
        const rows = course.sections.flatMap((section) =>
          section.lessons.map((lesson) => ({
            id: lesson.id,
            title: lesson.title,
            sectionTitle: section.title,
          })),
        );
        setLessons(rows);
        setLessonId((current) => (rows.some((row) => row.id === current) ? current : rows[0]?.id ?? ""));
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [courseId, props.token]);

  const selectedLessonTitle = useMemo(
    () => lessons.find((row) => row.id === lessonId)?.title,
    [lessons, lessonId],
  );

  async function pollEdit(videoId: string, editId: string): Promise<LibraryEdit> {
    const deadline = Date.now() + 15 * 60 * 1000;
    let last: LibraryEdit | null = null;
    while (Date.now() < deadline) {
      const edit = await withThrottleRetry(() =>
        apiGet<LibraryEdit>(`/videos/${videoId}/ai/edits/${editId}`, props.token),
      );
      last = edit;
      if (edit.status === "FAILED" || edit.status === "READY") return edit;
      await wait(3500);
    }
    throw new Error(last ? "Chỉnh video quá lâu. Thử lại với file ngắn hơn." : "Không đọc được tiến trình.");
  }

  async function processFile(file: File, localId: string) {
    const patch = (next: Partial<QueueRow>) => {
      setQueue((rows) => rows.map((row) => (row.localId === localId ? { ...row, ...next } : row)));
    };
    patch({ phase: "upload", progress: 4, label: "Đang tải lên máy chủ" });
    const session = await apiPost<{ videoId: string; upload: { url: string } }>(
      "/videos/upload-sessions",
      {
        filename: file.name,
        contentType: file.type || "video/mp4",
        title: file.name.replace(/\.[^.]+$/, "") || "Video bài học",
      },
      props.token,
    );
    await apiPutBinaryProgress(session.upload.url, file, file.type || "video/mp4", (ratio) => {
      patch({ progress: Math.max(4, Math.round(ratio * 28)), label: "Đang tải lên máy chủ" });
    });
    await apiPost(`/videos/${session.videoId}/complete`, { sizeBytes: file.size }, props.token, { retry429: true });
    patch({ phase: "prepare", progress: 32, label: "AI đang làm nét, lọc tiếng, cắt im lặng" });
    const started = await withThrottleRetry(
      () => apiPost<LibraryEdit>(`/videos/${session.videoId}/ai/prepare`, {}, props.token, { retry429: true }),
      5,
    );
    const edit = await pollEdit(session.videoId, started.id);
    if (edit.status === "FAILED") {
      throw new Error(edit.error || "Không chỉnh được video");
    }
    patch({ phase: "ready", progress: 100, label: "Xong — sẵn sàng gán vào bài" });
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
        label: "Chờ trong hàng",
      });
    }
    if (accepted.length) setQueue((rows) => [...rows, ...accepted]);
  }

  async function assign(videoId: string) {
    if (!lessonId) {
      setError("Chọn bài học bên dưới rồi bấm Gắn vào bài.");
      return;
    }
    setBusyId(videoId);
    setError(null);
    try {
      await withThrottleRetry(() =>
        apiPost(`/videos/${videoId}/assign`, { lessonId, courseId }, props.token, { retry429: true }),
      );
      setMsg(`Đã gắn vào bài${selectedLessonTitle ? `: ${selectedLessonTitle}` : ""}.`);
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
        Tải nhiều video một lúc. AI tự chạy công thức chuyên gia. Sau đó chọn khóa/bài và gắn từng video — hoặc chỉnh
        nhanh rồi mới gắn.
      </p>
      <FileDrop
        accept="video/mp4,video/*,application/octet-stream"
        multiple
        disabled={queue.length >= 40}
        label="Chọn nhiều video vào kho"
        hint="Có thể chọn hàng loạt. Tối đa 2 video AI chạy cùng lúc. Chưa cần chọn bài."
        onFile={(file) => enqueue([file])}
        onFiles={(files) => enqueue(files)}
      />
      <p className="muted auto-publish-legal">
        Chỉ dùng video bạn sở hữu. Đổi phong cách hay giảm nhạc nền không xóa bản quyền nội dung người khác.
      </p>
      {queue.length > 0 && (
        <ul className="video-inbox-queue">
          {queue.map((row) => (
            <li key={row.localId}>
              <strong>{row.name}</strong>
              <span>
                {row.progress}% — {row.label}
              </span>
              {row.error && <small className="error">{row.error}</small>}
            </li>
          ))}
        </ul>
      )}
      <div className="video-inbox-assign">
        <label>
          Gắn vào khóa
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
          Gắn vào bài
          <select value={lessonId} onChange={(event) => setLessonId(event.target.value)}>
            {lessons.length === 0 && <option value="">Khóa này chưa có bài</option>}
            {lessons.map((lesson) => (
              <option key={lesson.id} value={lesson.id}>
                {lesson.sectionTitle} — {lesson.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="muted">
        Trong kho chưa gán: <strong>{inboxCount}</strong>
      </p>
      {items.length === 0 && <p className="muted">Chưa có video trong kho. Chọn file phía trên.</p>}
      <ul className="video-inbox-list">
        {items.map((item) => {
          const editReady = item.edit?.status === "READY";
          const processing = item.edit?.status === "QUEUED" || item.edit?.status === "PROCESSING";
          return (
            <li key={item.id} className={item.inbox ? "is-inbox" : "is-assigned"}>
              <div className="video-inbox-meta">
                {item.thumbnailUrl && <img src={item.thumbnailUrl} alt="" />}
                <div>
                  <strong>{item.title}</strong>
                  <div className="muted">
                    {item.inbox ? "Chưa gán bài" : `Đã gán: ${item.assigned?.courseTitle} — ${item.assigned?.lessonTitle}`}
                    {processing ? ` · ${item.edit?.stepLabel || "Đang chỉnh"}` : ""}
                    {item.edit?.status === "FAILED" ? ` · Lỗi: ${item.edit.error}` : ""}
                  </div>
                </div>
              </div>
              {item.edit?.previewUrl && editReady && (
                <video className="ai-edit-preview" src={item.edit.previewUrl} controls preload="metadata" />
              )}
              <div className="video-inbox-row-actions">
                <button
                  type="button"
                  disabled={!lessonId || busyId === item.id || processing}
                  onClick={() => void assign(item.id)}
                >
                  {busyId === item.id ? "Đang gắn…" : item.inbox ? "Gắn vào bài đã chọn" : "Gắn lại vào bài đã chọn"}
                </button>
                {editReady && (
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => setOpenAdjust((current) => (current === item.id ? null : item.id))}
                  >
                    {openAdjust === item.id ? "Đóng chỉnh nhanh" : "Chỉnh nhanh"}
                  </button>
                )}
              </div>
              {openAdjust === item.id && editReady && (
                <VideoQuickAdjust
                  token={props.token}
                  videoId={item.id}
                  durationMs={item.edit?.output?.durationMs ?? item.durationMs ?? undefined}
                  previewUrl={item.edit?.previewUrl}
                  onUpdated={() => void refreshLibrary()}
                />
              )}
            </li>
          );
        })}
      </ul>
      {msg && <p className="ok">{msg}</p>}
      {error && <p className="toast error">{error}</p>}
    </div>
  );
}
