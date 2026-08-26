"use client";

import { useState } from "react";
import { FileDrop } from "@/components/FileDrop";
import { apiGet, apiPost, apiPutBinary } from "@/lib/api";

type AutoEdit = {
  id: string;
  status: "QUEUED" | "PROCESSING" | "READY" | "FAILED";
  error: string | null;
  previewUrl: string | null;
  editionPreviewUrl?: string | null;
  output: {
    appliedAt?: string;
    autoApplyError?: string;
    newVideoId?: string;
    editionVideoId?: string;
    title?: string;
    description?: string;
    providerNote?: string;
  } | null;
};

export type AutoPublishResult = {
  sourceVideoId: string;
  newVideoId: string;
  editionVideoId?: string;
  title?: string;
  description?: string;
  previewUrl: string | null;
  editionPreviewUrl: string | null;
};

const STATUS_COPY: Record<AutoEdit["status"], string> = {
  QUEUED: "Đã nhận video — đang xếp chỉnh hình + tiếng…",
  PROCESSING: "Đang chỉnh hình, tiếng, phụ đề, ảnh bìa và gắn vào bài…",
  READY: "Đang gắn video vào bài học…",
  FAILED: "Không chỉnh được video",
};

async function wait(ms: number) {
  await new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function pollEdit(videoId: string, editId: string, token: string): Promise<AutoEdit> {
  const deadline = Date.now() + 15 * 60 * 1000;
  while (Date.now() < deadline) {
    const edit = await apiGet<AutoEdit>(`/videos/${videoId}/ai/edits/${editId}`, token);
    if (edit.status === "FAILED") return edit;
    if (edit.status === "READY" && (edit.output?.appliedAt || edit.output?.autoApplyError)) {
      return edit;
    }
    await wait(2500);
  }
  throw new Error("Chỉnh video quá lâu. Thử lại với file ngắn hơn.");
}

export function AutoVideoPublish(props: {
  token: string;
  lessonId?: string;
  courseId?: string;
  lessonTitle?: string;
  videoTitle?: string;
  disabled?: boolean;
  onDone?: (result: AutoPublishResult) => void;
}) {
  const [phase, setPhase] = useState<"idle" | "working" | "done" | "failed">("idle");
  const [statusText, setStatusText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AutoPublishResult | null>(null);

  const ready = Boolean(props.lessonId) && !props.disabled && phase !== "working";

  async function handleFile(file: File) {
    if (!props.lessonId) {
      setError("Chọn bài học trước khi tải video.");
      return;
    }
    setPhase("working");
    setError(null);
    setResult(null);
    setStatusText("Đang tải video lên…");
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
      await apiPutBinary(session.upload.url, file, file.type || "video/mp4").catch(() => undefined);
      await apiPost(`/videos/${session.videoId}/complete`, { sizeBytes: file.size }, props.token);
      setStatusText("Đang chỉnh hình + tiếng và gắn vào bài…");
      const started = await apiPost<AutoEdit>(
        `/videos/${session.videoId}/ai/auto-publish`,
        { lessonId: props.lessonId, courseId: props.courseId },
        props.token,
      );
      setStatusText(STATUS_COPY[started.status]);
      let edit = await pollEdit(session.videoId, started.id, props.token);
      if (edit.status === "READY" && edit.output?.autoApplyError && !edit.output.appliedAt) {
        setStatusText("Đã chỉnh xong — đang gắn lại vào bài…");
        edit = await apiPost<AutoEdit>(
          `/videos/${session.videoId}/ai/edits/${edit.id}/apply`,
          { lessonId: props.lessonId, courseId: props.courseId },
          props.token,
        );
      }
      if (edit.status === "FAILED") {
        throw new Error(edit.error || "Không chỉnh được video");
      }
      if (!edit.output?.appliedAt) {
        throw new Error(edit.output?.autoApplyError || "Đã chỉnh video nhưng chưa gắn được vào bài.");
      }
      const next: AutoPublishResult = {
        sourceVideoId: session.videoId,
        newVideoId: edit.output.newVideoId || session.videoId,
        editionVideoId: edit.output.editionVideoId,
        title: edit.output.title,
        description: edit.output.description,
        previewUrl: edit.previewUrl,
        editionPreviewUrl: edit.editionPreviewUrl ?? null,
      };
      setResult(next);
      setPhase("done");
      setStatusText("Xong — video đã gắn vào bài.");
      props.onDone?.(next);
    } catch (err) {
      setPhase("failed");
      setError(err instanceof Error ? err.message : "Không tải và gắn được video");
      setStatusText("");
    }
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
        hint="Hệ thống tự chỉnh hình + tiếng, phụ đề, ảnh bìa rồi gắn vào bài đã chọn"
        onFile={(file) => void handleFile(file)}
      />
      <p className="muted auto-publish-legal">
        Chỉ dùng video bạn sở hữu. Đổi phong cách hay giảm nhạc nền không xóa bản quyền nội dung người khác.
      </p>
      {phase === "working" && <p className="auto-publish-status">{statusText}</p>}
      {phase === "done" && result && (
        <div className="auto-publish-done">
          <p className="ok">{statusText}</p>
          {result.previewUrl && (
            <>
              <div className="muted">Bài học đã chỉnh</div>
              <video className="ai-edit-preview" src={result.previewUrl} controls preload="metadata" />
            </>
          )}
          {result.editionPreviewUrl && (
            <>
              <div className="muted">Bản minh họa (tiếng gốc)</div>
              <video className="ai-edit-preview" src={result.editionPreviewUrl} controls preload="metadata" />
            </>
          )}
        </div>
      )}
      {error && <p className="toast error">{error}</p>}
    </div>
  );
}
