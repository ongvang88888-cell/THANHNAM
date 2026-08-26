"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";

type ToolGroup = "audio" | "image" | "copy";

type CatalogTool = {
  id: string;
  group: ToolGroup;
  label: string;
  description: string;
  market: string;
  outputKind: "video" | "image" | "vtt" | "copy";
  available: boolean;
  mode: "full" | "fallback";
  note: string | null;
};

type Catalog = {
  enabled: boolean;
  capabilities: { ffmpeg: boolean; speech: boolean; imageGen: boolean; llm: boolean };
  video: { id: string; title: string; status: string; hasSource: boolean; thumbnailUrl: string | null };
  tools: CatalogTool[];
};

type EditRow = {
  id: string;
  tool: string;
  label: string;
  group: ToolGroup;
  status: "QUEUED" | "PROCESSING" | "READY" | "FAILED";
  provider: string;
  error: string | null;
  previewUrl: string | null;
  createdAt: string;
  output: {
    kind: "video" | "image" | "vtt" | "copy";
    text?: string;
    title?: string;
    description?: string;
    tags?: string[];
    providerNote?: string;
    newVideoId?: string;
  } | null;
};

const GROUP_LABEL: Record<ToolGroup, string> = {
  audio: "Âm thanh",
  image: "Hình ảnh",
  copy: "Nội dung",
};

export function VideoAiEditPanel(props: {
  videoId: string;
  token: string;
  lessonId?: string;
  courseId?: string;
  onNewVideoId?: (videoId: string) => void;
  onCopy?: (copy: { title: string; description: string }) => void;
}) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [edits, setEdits] = useState<EditRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busyTool, setBusyTool] = useState<string | null>(null);

  const pending = edits.some((row) => row.status === "QUEUED" || row.status === "PROCESSING");

  async function refresh() {
    const [nextCatalog, nextEdits] = await Promise.all([
      apiGet<Catalog>(`/videos/${props.videoId}/ai/catalog`, props.token),
      apiGet<{ edits: EditRow[] }>(`/videos/${props.videoId}/ai/edits`, props.token),
    ]);
    setCatalog(nextCatalog);
    setEdits(nextEdits.edits);
  }

  useEffect(() => {
    let cancelled = false;
    refresh()
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.videoId, props.token]);

  useEffect(() => {
    if (!pending) return;
    const timer = window.setInterval(() => {
      refresh().catch(() => undefined);
    }, 2500);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, props.videoId, props.token]);

  const grouped = useMemo(() => {
    const tools = catalog?.tools ?? [];
    return (["audio", "image", "copy"] as const).map((group) => ({
      group,
      tools: tools.filter((tool) => tool.group === group),
    }));
  }, [catalog]);

  async function start(toolId: string) {
    setBusyTool(toolId);
    setError(null);
    setMsg(null);
    try {
      await apiPost(`/videos/${props.videoId}/ai/edits`, { tool: toolId, options: {} }, props.token);
      setMsg("Đã xếp lệnh chỉnh. Đợi vài giây rồi xem kết quả bên dưới.");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không chạy được công cụ AI");
    } finally {
      setBusyTool(null);
    }
  }

  async function apply(edit: EditRow) {
    setBusyTool(edit.id);
    setError(null);
    setMsg(null);
    try {
      const result = await apiPost<{
        newVideoId?: string;
        title?: string;
        description?: string;
        applied: string[];
      }>(
        `/videos/${props.videoId}/ai/edits/${edit.id}/apply`,
        { lessonId: props.lessonId, courseId: props.courseId },
        props.token,
      );
      if (result.newVideoId) props.onNewVideoId?.(result.newVideoId);
      if (result.title && result.description) {
        props.onCopy?.({ title: result.title, description: result.description });
      }
      const bits = result.applied.length ? result.applied.join(", ") : "kết quả";
      setMsg(`Đã áp dụng ${bits}. Duyệt lại trước khi gửi học viên. Nhớ Lưu bài nếu gắn video mới.`);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không áp dụng được");
    } finally {
      setBusyTool(null);
    }
  }

  if (!catalog) {
    return <p className="muted">Đang mở studio AI…</p>;
  }

  return (
    <div className="ai-edit-panel">
      <h3>4. Chỉnh sửa AI (hình + tiếng)</h3>
      <p className="muted">
        Sau khi tải video, chạy từng công cụ giống Descript / CapCut / Adobe Enhance, rồi bấm Áp dụng.
        Phụ đề và ảnh bìa cần bạn duyệt trước khi công khai.
      </p>
      {!catalog.enabled && <p className="toast error">Chỉnh sửa AI đang tắt trên máy chủ.</p>}
      <div className="ai-edit-caps">
        <span className={`badge ${catalog.capabilities.ffmpeg ? "ok" : ""}`}>
          ffmpeg {catalog.capabilities.ffmpeg ? "sẵn" : "thiếu"}
        </span>
        <span className={`badge ${catalog.capabilities.speech ? "ok" : ""}`}>
          Whisper {catalog.capabilities.speech ? "sẵn" : "chưa khóa"}
        </span>
        <span className={`badge ${catalog.capabilities.imageGen ? "ok" : ""}`}>
          Ảnh AI {catalog.capabilities.imageGen ? "sẵn" : "poster chữ"}
        </span>
        <span className={`badge ${catalog.capabilities.llm ? "ok" : ""}`}>
          LLM {catalog.capabilities.llm ? "sẵn" : "gợi ý tiêu đề"}
        </span>
      </div>
      {error && <p className="toast error">{error}</p>}
      {msg && <p className="toast ok">{msg}</p>}

      {grouped.map((block) => (
        <div key={block.group}>
          <h4>{GROUP_LABEL[block.group]}</h4>
          <div className="ai-edit-grid">
            {block.tools.map((tool) => (
              <button
                key={tool.id}
                type="button"
                className="ai-edit-tool"
                disabled={!tool.available || busyTool !== null || pending}
                onClick={() => void start(tool.id)}
              >
                <strong>{tool.label}</strong>
                <small>{tool.description}</small>
                <small>Học từ {tool.market}</small>
                {tool.note ? <small>{tool.note}</small> : null}
                {tool.mode === "fallback" && tool.available ? <span className="badge">Bản rút gọn</span> : null}
              </button>
            ))}
          </div>
        </div>
      ))}

      {catalog.video.thumbnailUrl && (
        <img className="ai-edit-thumb" src={catalog.video.thumbnailUrl} alt="Ảnh bìa video" />
      )}

      <h4>Lịch sử chỉnh</h4>
      {edits.length === 0 && <p className="muted">Chưa có lệnh nào. Chọn một công cụ phía trên.</p>}
      <ul className="ai-edit-history">
        {edits.map((edit) => (
          <li key={edit.id}>
            <div>
              <strong>{edit.label}</strong>{" "}
              <span className={`badge ${edit.status === "READY" ? "ok" : edit.status === "FAILED" ? "err" : ""}`}>
                {edit.status}
              </span>
              <div className="muted">
                {edit.provider}
                {edit.output?.providerNote ? ` · ${edit.output.providerNote}` : ""}
              </div>
              {edit.error && <div className="error">{edit.error}</div>}
              {edit.output?.title && <div>Tiêu đề: {edit.output.title}</div>}
              {edit.output?.description && <p className="muted">{edit.output.description}</p>}
              {edit.output?.text && edit.output.kind === "vtt" && (
                <pre className="ai-edit-vtt">{edit.output.text}</pre>
              )}
              {edit.status === "READY" && edit.previewUrl && edit.output?.kind === "image" && (
                <img className="ai-edit-thumb" src={edit.previewUrl} alt={edit.label} />
              )}
              {edit.status === "READY" && edit.previewUrl && edit.output?.kind === "video" && (
                <video className="ai-edit-preview" src={edit.previewUrl} controls preload="metadata" />
              )}
              {edit.status === "READY" && edit.previewUrl && edit.output?.kind === "vtt" && (
                <a href={edit.previewUrl} target="_blank" rel="noreferrer">
                  Tải file VTT
                </a>
              )}
            </div>
            {edit.status === "READY" && (
              <button type="button" className="secondary btn-sm" disabled={busyTool !== null} onClick={() => void apply(edit)}>
                Áp dụng
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
