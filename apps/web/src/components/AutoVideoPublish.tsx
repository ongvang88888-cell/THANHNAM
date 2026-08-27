"use client";

import { useMemo, useState } from "react";
import { FileDrop } from "@/components/FileDrop";
import { RecipeChecklist } from "@/components/LectureRecipeProgress";
import { VideoQuickAdjust } from "@/components/VideoQuickAdjust";
import { ApiError, apiGet, apiPatch, apiPost, apiPut, apiPutBinaryProgress } from "@/lib/api";
import { PIPELINE_STEPS, WAN_EDIT_POLL_MS, pipelineStepById, type PipelineStepId, type RecipeRow } from "@/lib/lecture-recipe";

type StepId = PipelineStepId;

type AutoEdit = {
  id: string;
  status: "QUEUED" | "PROCESSING" | "READY" | "FAILED";
  error: string | null;
  previewUrl: string | null;
  editionPreviewUrl?: string | null;
  progress?: number;
  step?: string;
  stepLabel?: string;
  output: {
    appliedAt?: string;
    autoApplyError?: string;
    newVideoId?: string;
    editionVideoId?: string;
    durationMs?: number;
    title?: string;
    description?: string;
    providerNote?: string;
    progress?: number;
    step?: string;
    stepLabel?: string;
    recipeId?: string;
    techniques?: RecipeRow[];
  } | null;
};

type LessonSnapshot = {
  id: string;
  title: string;
  contents: Array<{ contentType: string; body?: string | null; refId?: string | null }>;
};

type CourseSnapshot = {
  id: string;
  sections: Array<{ lessons: LessonSnapshot[] }>;
};

export type AutoPublishResult = {
  sourceVideoId: string;
  newVideoId: string;
  editionVideoId?: string;
  editId?: string;
  durationMs?: number;
  title?: string;
  description?: string;
  previewUrl: string | null;
  editionPreviewUrl: string | null;
};

const MAX_UPLOAD_BYTES = 400 * 1024 * 1024;

async function wait(ms: number) {
  await new Promise((resolve) => window.setTimeout(resolve, ms));
}

function stepById(id: string | undefined) {
  return pipelineStepById(id);
}

function friendlyError(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) {
    if (/Throttler|Too Many Requests/i.test(err.message)) {
      return "Đang có nhiều thao tác. Đợi vài giây rồi thử lại — không cần chọn lại video.";
    }
    return err.message;
  }
  return "Không tải và chỉnh được video";
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
        (err instanceof Error && /Throttler|Too Many Requests/i.test(err.message));
      if (throttled && attempt < attempts - 1) {
        await wait(1500 * 2 ** attempt);
        continue;
      }
      throw err;
    }
  }
  throw last instanceof Error ? last : new Error("Đang có nhiều thao tác. Đợi vài giây rồi thử lại — không cần chọn lại video.");
}

function resultFromEdit(sourceVideoId: string, edit: AutoEdit): AutoPublishResult {
  return {
    sourceVideoId,
    newVideoId: edit.output?.newVideoId || sourceVideoId,
    editionVideoId: edit.output?.editionVideoId,
    editId: edit.id,
    durationMs: edit.output?.durationMs,
    title: edit.output?.title,
    description: edit.output?.description,
    previewUrl: edit.previewUrl,
    editionPreviewUrl: edit.editionPreviewUrl ?? null,
  };
}

export function AutoVideoPublish(props: {
  token: string;
  lessonId?: string;
  courseId?: string;
  lessonTitle?: string;
  videoTitle?: string;
  studioHref?: string;
  disabled?: boolean;
  onReady?: (result: AutoPublishResult) => void;
  onSave?: (result: AutoPublishResult) => Promise<void> | void;
  onDone?: (result: AutoPublishResult) => void;
}) {
  const [phase, setPhase] = useState<"idle" | "working" | "ready" | "saving" | "saved" | "failed">("idle");
  const [progress, setProgress] = useState(0);
  const [stepId, setStepId] = useState<StepId>("upload");
  const [stepLabel, setStepLabel] = useState<string>(PIPELINE_STEPS[0].label);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AutoPublishResult | null>(null);
  const [pendingEdit, setPendingEdit] = useState<AutoEdit | null>(null);
  const [sourceVideoId, setSourceVideoId] = useState<string | null>(null);

  const ready = Boolean(props.lessonId) && !props.disabled && phase !== "working" && phase !== "saving";
  const showBar = phase === "working" || phase === "ready" || phase === "saving" || phase === "saved";

  const currentIndex = useMemo(
    () => Math.max(0, PIPELINE_STEPS.findIndex((step) => step.id === stepId)),
    [stepId],
  );

  function applyClientStep(id: StepId, percent?: number) {
    const step = stepById(id);
    if (!step) return;
    setStepId(step.id);
    setStepLabel(step.label);
    setProgress(percent ?? step.percent);
  }

  function applyServerEdit(edit: AutoEdit) {
    const nextProgress = edit.output?.progress ?? edit.progress;
    const nextStep = edit.output?.step ?? edit.step;
    const nextLabel = edit.output?.stepLabel ?? edit.stepLabel;
    const known = stepById(nextStep);
    if (known) setStepId(known.id);
    if (nextLabel) setStepLabel(nextLabel);
    if (typeof nextProgress === "number" && Number.isFinite(nextProgress)) {
      setProgress(Math.max(0, Math.min(100, Math.round(nextProgress))));
    } else if (known) {
      setProgress(known.percent);
    }
  }

  async function pollEdit(videoId: string, editId: string): Promise<AutoEdit> {
    const deadline = Date.now() + WAN_EDIT_POLL_MS;
    let last: AutoEdit | null = null;
    while (Date.now() < deadline) {
      const edit = await withThrottleRetry(() =>
        apiGet<AutoEdit>(`/videos/${videoId}/ai/edits/${editId}`, props.token),
      );
      last = edit;
      applyServerEdit(edit);
      setPendingEdit(edit);
      if (edit.status === "FAILED" || edit.status === "READY") return edit;
      await wait(3500);
    }
    throw new Error(last ? "Chỉnh video quá lâu. Thử lại với file ngắn hơn." : "Không đọc được tiến trình chỉnh video.");
  }

  async function persistLesson(next: AutoPublishResult) {
    if (!props.courseId || !props.lessonId) {
      throw new Error("Thiếu khóa học hoặc bài học để lưu.");
    }
    const course = await apiGet<CourseSnapshot>(`/teacher/courses/${props.courseId}`, props.token);
    const lesson = course.sections.flatMap((section) => section.lessons).find((row) => row.id === props.lessonId);
    if (!lesson) throw new Error("Không tìm thấy bài học để lưu.");
    const existingBody = lesson.contents.find((row) => row.contentType === "TEXT")?.body?.trim() || "";
    const documentIds = lesson.contents
      .filter((row) => row.contentType === "DOCUMENT" && row.refId)
      .map((row) => String(row.refId));
    const placeholder = !lesson.title.trim() || /^(bài(\s*học)?(\s*mới)?(\s*\d+)?|lesson(\s+\d+)?|new lesson|video bài học)$/i.test(lesson.title.trim());
    const title = (placeholder ? next.title || props.lessonTitle || lesson.title : lesson.title).trim();
    await apiPatch(
      `/teacher/courses/${props.courseId}/lessons/${props.lessonId}`,
      { title },
      props.token,
    );
    await apiPut(
      `/teacher/courses/${props.courseId}/lessons/${props.lessonId}/content`,
      {
        body: existingBody || next.description || "",
        videoId: next.newVideoId,
        documentIds,
      },
      props.token,
    );
  }

  async function handleFile(file: File) {
    if (!props.lessonId) {
      setError("Chọn bài học trước khi tải video.");
      return;
    }
    if (file.size < 1024) {
      setError("File video quá nhỏ hoặc trống.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError("Video quá lớn (tối đa 400MB).");
      return;
    }
    setPhase("working");
    setError(null);
    setResult(null);
    setPendingEdit(null);
    setSourceVideoId(null);
    applyClientStep("upload", 2);
    try {
      const session = await apiPost<{ videoId: string; upload: { url: string } }>(
        "/videos/upload-sessions",
        {
          filename: file.name,
          contentType: file.type || "video/mp4",
          title: props.videoTitle || props.lessonTitle || file.name,
        },
        props.token,
      );
      setSourceVideoId(session.videoId);
      await apiPutBinaryProgress(session.upload.url, file, file.type || "video/mp4", (ratio) => {
        applyClientStep("upload", Math.max(2, Math.round(ratio * 8)));
      });
      const completed = await apiPost<{ videoId: string; edit?: AutoEdit }>(
        `/videos/${session.videoId}/complete`,
        {
          sizeBytes: file.size,
          lessonId: props.lessonId,
          courseId: props.courseId,
        },
        props.token,
        { retry429: true },
      );
      applyClientStep("queue");
      const started =
        completed.edit ??
        (await withThrottleRetry(
          () =>
            apiPost<AutoEdit>(
              `/videos/${session.videoId}/ai/auto-publish`,
              { lessonId: props.lessonId, courseId: props.courseId },
              props.token,
              { retry429: true },
            ),
          4,
        ));
      applyServerEdit(started);
      const edit = await pollEdit(session.videoId, started.id);
      if (edit.status === "FAILED") {
        throw new Error(edit.error || "Không chỉnh được video");
      }
      const next = resultFromEdit(session.videoId, edit);
      setPendingEdit(edit);
      setResult(next);
      applyClientStep("done");
      setPhase("ready");
      props.onReady?.(next);
      await attachToLesson(next, edit, session.videoId);
    } catch (err) {
      setPhase("failed");
      setError(friendlyError(err));
    }
  }

  async function attachToLesson(next: AutoPublishResult, edit: AutoEdit | null, videoId: string) {
    setPhase("saving");
    setError(null);
    applyClientStep("apply");
    try {
      let current = edit;
      if (current && !current.output?.appliedAt) {
        const editId = current.id;
        current = await withThrottleRetry(
          () =>
            apiPost<AutoEdit>(
              `/videos/${videoId}/ai/edits/${editId}/apply`,
              { lessonId: props.lessonId, courseId: props.courseId },
              props.token,
              { retry429: true },
            ),
          3,
        );
        applyServerEdit(current);
      }
      const attached = current ? resultFromEdit(videoId, current) : next;
      setPendingEdit(current);
      setResult(attached);
      if (props.onSave) {
        await props.onSave(attached);
      } else {
        await persistLesson(attached);
      }
      applyClientStep("done");
      setPhase("saved");
      props.onDone?.(attached);
    } catch (err) {
      setPhase("ready");
      setError(friendlyError(err));
    }
  }

  async function handleSave() {
    if (!result || !props.lessonId || !sourceVideoId) return;
    await attachToLesson(result, pendingEdit, sourceVideoId);
  }

  return (
    <div className="auto-publish">
      <p className="auto-publish-target">
        {props.lessonTitle ? (
          <>
            Gắn vào bài: <strong>{props.lessonTitle}</strong>
          </>
        ) : (
          "Chọn bài học trước, rồi chọn video."
        )}
      </p>
      <FileDrop
        accept="video/mp4,video/*,application/octet-stream"
        disabled={!ready}
        label="Chọn video để lên bài"
        hint="Chọn một file. Máy chủ tự chạy ngay: Nano Banana vẽ ảnh (nếu chưa có), Wan 2.2 thay người, giữ tiếng gốc, rồi gắn vào bài. Không thẻ chữ, không Ken Burns. Bài dài chạy từng đoạn ~20 giây."
        onFile={(file) => void handleFile(file)}
      />
      <p className="muted auto-publish-legal">
        Chỉ dùng video bạn sở hữu. Đổi phong cách hay giảm nhạc nền không xóa bản quyền nội dung người khác.
      </p>
      {showBar && (
        <div className="auto-publish-progress" aria-live="polite">
          <div className="auto-publish-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
            <span style={{ width: `${progress}%` }} />
          </div>
          <p className="auto-publish-step">
            {progress}% — {stepLabel}
          </p>
          <ol className="auto-publish-steps">
            {PIPELINE_STEPS.map((step, index) => {
              const state = index < currentIndex ? "is-done" : index === currentIndex ? "is-current" : "";
              return (
                <li key={step.id} className={state}>
                  {index < currentIndex ? "✓" : index === currentIndex ? "→" : "·"} {step.label}
                </li>
              );
            })}
          </ol>
          <RecipeChecklist rows={pendingEdit?.output?.techniques} />
        </div>
      )}
      {(phase === "ready" || phase === "saving" || phase === "saved") && result && (
        <div className="auto-publish-done">
          {phase === "ready" && (
            <p className="ok">Đã chỉnh xong. Nếu chưa gắn vào bài, bấm Lưu vào bài.</p>
          )}
          {phase === "saving" && <p className="auto-publish-status">Đang lưu video vào bài học…</p>}
          {phase === "saved" && <p className="ok">Đã lưu vào bài.</p>}
          {sourceVideoId && (phase === "ready" || phase === "saving" || phase === "saved") && (
            <>
            <div className="muted">Bài học đã chỉnh — Wan 2.2 thay người, giữ tiếng gốc</div>
            <VideoQuickAdjust
              token={props.token}
              videoId={sourceVideoId}
              durationMs={result.durationMs}
              previewUrl={result.previewUrl}
              disabled={phase === "saving"}
              onUpdated={(next) => {
                setResult((current) =>
                  current
                    ? {
                        ...current,
                        previewUrl: next.previewUrl ?? current.previewUrl,
                        durationMs: next.durationMs ?? current.durationMs,
                        newVideoId: next.newVideoId || current.newVideoId,
                      }
                    : current,
                );
              }}
            />
            </>
          )}
          {phase !== "saved" && (
            <button type="button" className="auto-publish-save" disabled={phase === "saving"} onClick={() => void handleSave()}>
              {phase === "saving" ? "Đang lưu…" : "Lưu vào bài"}
            </button>
          )}
          {phase === "saved" && props.studioHref && (
            <a className="btn secondary" href={props.studioHref}>
              Mở studio bài học
            </a>
          )}
        </div>
      )}
      {error && <p className="toast error">{error}</p>}
    </div>
  );
}

