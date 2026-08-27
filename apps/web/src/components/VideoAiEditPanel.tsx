"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { ProviderFeatureList, type ProviderFeatureCatalog } from "@/components/ProviderFeatureList";

type VideoAiEditPanelProps = {
  videoId: string;
  token: string;
  lessonId?: string;
  courseId?: string;
  variant?: "full" | "advanced";
  onNewVideoId?: (videoId: string) => void;
  onCopy?: (copy: { title: string; description: string }) => void;
};

type CatalogTool = {
  id: string;
  label: string;
  description: string;
  market: string;
  outputKind: "video" | "image" | "vtt" | "copy";
  available: boolean;
  mode: "full" | "fallback";
  note: string | null;
};

type CharacterView = {
  name: string;
  ready: boolean;
  gap: string;
  autoReplace: boolean;
};

type Catalog = {
  enabled: boolean;
  ownershipDisclaimer?: string;
  character?: CharacterView;
  capabilities: {
    ffmpeg: boolean;
    wan?: boolean;
    nanoBanana?: boolean;
    fal?: boolean;
    dashscope?: boolean;
  };
  providers?: ProviderFeatureCatalog;
  video: { id: string; title: string; status: string; hasSource: boolean; thumbnailUrl: string | null };
  tools: CatalogTool[];
};

type EditRow = {
  id: string;
  tool: string;
  label: string;
  status: "QUEUED" | "PROCESSING" | "READY" | "FAILED";
  provider: string;
  error: string | null;
  previewUrl: string | null;
  createdAt: string;
  output: {
    kind: "video" | "image" | "vtt" | "copy";
    title?: string;
    description?: string;
    providerNote?: string;
    newVideoId?: string;
  } | null;
};

export function VideoAiEditPanel(props: VideoAiEditPanelProps) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [edits, setEdits] = useState<EditRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busyTool, setBusyTool] = useState<string | null>(null);
  const [ownedConfirmed, setOwnedConfirmed] = useState(false);

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
    refresh().catch((e: Error) => {
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
    }, 3500);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, props.videoId, props.token]);

  const packTool = catalog?.tools.find((tool) => tool.id === "owned_abc") ?? null;

  async function start() {
    if (!ownedConfirmed) {
      setError("Hãy xác nhận video này là của bạn trước khi chạy Wan 2.2.");
      return;
    }
    setBusyTool("owned_abc");
    setError(null);
    setMsg(null);
    try {
      await apiPost(
        `/videos/${props.videoId}/ai/edits`,
        {
          tool: "owned_abc",
          options: { confirmOwned: true },
        },
        props.token,
      );
      setMsg("Đã xếp hàng Wan 2.2 + Nano Banana. Bài dài chạy từng đoạn ~20 giây — có thể mất nhiều phút.");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không chạy được Wan 2.2");
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
    return <p className="muted">Đang mở chỉnh video AI…</p>;
  }

  return (
    <div className="ai-edit-panel">
      {props.variant === "advanced" ? <h3>Chạy lại Wan 2.2</h3> : <h3>4. Wan 2.2 + Nano Banana</h3>}
      <p className="muted">
        Học từ Short Nano Banana + Wan 2.2: vẽ một ảnh nhân vật, rồi thay người trong video, giữ chuyển động và tiếng
        gốc. Không thẻ chữ, không Ken Burns, không tô hoạt hình trên máy. Cần FAL_KEY hoặc DASHSCOPE_API_KEY trên máy
        chủ, và ảnh https hoặc GEMINI_API_KEY.
      </p>
      {catalog.character ? (
        <p className={catalog.character.ready ? "toast" : "muted"}>
          Nhân vật dùng chung: <strong>{catalog.character.name}</strong> — {catalog.character.gap}{" "}
          <a href="/teacher?tab=upload">Sửa hồ sơ</a>
        </p>
      ) : null}
      <p className="ai-edit-legal muted">
        {catalog.ownershipDisclaimer ??
          "Chỉ dùng video bạn sở hữu. Đổi phong cách hay giảm nhạc nền không xóa bản quyền nội dung người khác."}
      </p>
      {!catalog.enabled && <p className="toast error">Chỉnh sửa AI đang tắt trên máy chủ.</p>}
      <div className="ai-edit-caps">
        <span className={`badge ${catalog.capabilities.ffmpeg ? "ok" : ""}`}>
          ffmpeg {catalog.capabilities.ffmpeg ? "sẵn" : "thiếu"}
        </span>
        <span className={`badge ${catalog.capabilities.wan ? "ok" : ""}`}>
          Wan 2.2 {catalog.capabilities.wan ? "sẵn" : "chưa khóa"}
        </span>
        <span className={`badge ${catalog.capabilities.fal ? "ok" : ""}`}>
          Fal {catalog.capabilities.fal ? "sẵn" : "chưa FAL_KEY"}
        </span>
        <span className={`badge ${catalog.capabilities.dashscope ? "ok" : ""}`}>
          DashScope {catalog.capabilities.dashscope ? "sẵn" : "chưa khóa"}
        </span>
        <span className={`badge ${catalog.capabilities.nanoBanana ? "ok" : ""}`}>
          Nano Banana {catalog.capabilities.nanoBanana ? "sẵn" : "chưa GEMINI_API_KEY"}
        </span>
      </div>
      {catalog.providers ? <ProviderFeatureList providers={catalog.providers} /> : null}
      {error && <p className="toast error">{error}</p>}
      {msg && <p className="toast ok">{msg}</p>}

      {packTool && (
        <div className="ai-edit-pack">
          <label className="ai-edit-owned">
            <input
              type="checkbox"
              checked={ownedConfirmed}
              onChange={(event) => setOwnedConfirmed(event.target.checked)}
            />
            Tôi cam kết chỉ dùng video tôi sở hữu. Wan 2.2 thay người trên video này.
          </label>
          <button
            type="button"
            className="ai-edit-tool ai-edit-tool-pack"
            disabled={!packTool.available || busyTool !== null || pending || !ownedConfirmed}
            onClick={() => void start()}
          >
            <strong>{packTool.label}</strong>
            <small>{packTool.description}</small>
            <small>Học từ {packTool.market}</small>
            {packTool.note ? <small>{packTool.note}</small> : null}
            {packTool.mode === "fallback" && packTool.available ? <span className="badge">Thiếu ảnh / Gemini</span> : null}
          </button>
        </div>
      )}

      {catalog.video.thumbnailUrl && (
        <img className="ai-edit-thumb" src={catalog.video.thumbnailUrl} alt="Ảnh bìa video" />
      )}

      <h4>Lịch sử chỉnh</h4>
      {edits.length === 0 && <p className="muted">Chưa có lệnh nào. Xác nhận sở hữu rồi bấm Wan 2.2 thay người.</p>}
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
              {edit.status === "READY" && edit.previewUrl && edit.output?.kind === "video" && (
                <>
                  <div className="muted">Wan 2.2 đã thay người — tiếng gốc</div>
                  <video className="ai-edit-preview" src={edit.previewUrl} controls preload="metadata" />
                </>
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

export function LazyVideoAiEditPanel(props: VideoAiEditPanelProps) {
  const [open, setOpen] = useState(false);
  return (
    <details
      className="auto-publish-advanced"
      onToggle={(event) => setOpen((event.currentTarget as HTMLDetailsElement).open)}
    >
      <summary>Chạy lại Wan 2.2 trên video này</summary>
      {open ? (
        <VideoAiEditPanel {...props} />
      ) : (
        <p className="muted">Mở mục này chỉ khi cần chạy lại thay người. Không mở khi đang tải video tự động.</p>
      )}
    </details>
  );
}
