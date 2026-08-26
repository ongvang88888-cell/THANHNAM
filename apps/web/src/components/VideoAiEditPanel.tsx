"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";

type VideoAiEditPanelProps = {
  videoId: string;
  token: string;
  lessonId?: string;
  courseId?: string;
  variant?: "full" | "advanced";
  onNewVideoId?: (videoId: string) => void;
  onCopy?: (copy: { title: string; description: string }) => void;
};

type ToolGroup = "audio" | "image" | "copy";
type FaceRegion = "speaker" | "full" | "pip_br" | "pip_bl" | "pip_tr" | "pip_tl";
type VisualStyle = "anime" | "flat" | "watercolor";
type ToonStrength = "low" | "medium" | "high";

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
  ownershipDisclaimer?: string;
  capabilities: {
    ffmpeg: boolean;
    speech: boolean;
    imageGen: boolean;
    llm: boolean;
    tts?: boolean;
    heygen?: boolean;
    elevenlabs?: boolean;
  };
  video: { id: string; title: string; status: string; hasSource: boolean; thumbnailUrl: string | null };
  tools: CatalogTool[];
};

const TARGET_LANGUAGES = [
  { id: "vi", label: "Tiếng Việt" },
  { id: "en", label: "English" },
  { id: "zh", label: "中文" },
  { id: "ja", label: "日本語" },
  { id: "ko", label: "한국어" },
  { id: "fr", label: "Français" },
  { id: "de", label: "Deutsch" },
  { id: "es", label: "Español" },
  { id: "th", label: "ไทย" },
  { id: "id", label: "Bahasa Indonesia" },
] as const;

type EditRow = {
  id: string;
  tool: string;
  label: string;
  group: ToolGroup;
  status: "QUEUED" | "PROCESSING" | "READY" | "FAILED";
  provider: string;
  error: string | null;
  previewUrl: string | null;
  editionPreviewUrl?: string | null;
  createdAt: string;
  output: {
    kind: "video" | "image" | "vtt" | "copy";
    text?: string;
    title?: string;
    description?: string;
    tags?: string[];
    providerNote?: string;
    newVideoId?: string;
    editionVideoId?: string;
  } | null;
};

const GROUP_LABEL: Record<ToolGroup, string> = {
  audio: "Âm thanh",
  image: "Hình ảnh",
  copy: "Nội dung",
};

const REGION_LABEL: Record<FaceRegion, string> = {
  speaker: "Người giữa khung (giữ slide)",
  full: "Cả người / cả khung",
  pip_br: "Mặt góc phải dưới (PIP)",
  pip_bl: "Mặt góc trái dưới",
  pip_tr: "Mặt góc phải trên",
  pip_tl: "Mặt góc trái trên",
};

const STYLE_LABEL: Record<VisualStyle, string> = {
  anime: "Hoạt hình (cel + nét mực)",
  flat: "Phẳng / truyện tranh",
  watercolor: "Màu nước",
};

const STRENGTH_LABEL: Record<ToonStrength, string> = {
  high: "Đậm — gần hoạt hình hẳn",
  medium: "Vừa — còn nhận ra mặt",
  low: "Nhẹ — lớp màu hoạt hình",
};

export function VideoAiEditPanel(props: VideoAiEditPanelProps) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [edits, setEdits] = useState<EditRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busyTool, setBusyTool] = useState<string | null>(null);
  const [region, setRegion] = useState<FaceRegion>("speaker");
  const [style, setStyle] = useState<VisualStyle>("anime");
  const [toonStrength, setToonStrength] = useState<ToonStrength>("high");
  const [ownedConfirmed, setOwnedConfirmed] = useState(false);
  const [confirmLikeness, setConfirmLikeness] = useState(false);
  const [confirmFaceEdit, setConfirmFaceEdit] = useState(false);
  const [confirmVoiceClone, setConfirmVoiceClone] = useState(false);
  const [script, setScript] = useState("");
  const [targetLanguage, setTargetLanguage] = useState<(typeof TARGET_LANGUAGES)[number]["id"]>("en");
  const [startSec, setStartSec] = useState("");
  const [endSec, setEndSec] = useState("");

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

  const packTool = catalog?.tools.find((tool) => tool.id === "owned_abc") ?? null;

  const grouped = useMemo(() => {
    const tools = catalog?.tools ?? [];
    return (["audio", "image", "copy"] as const).map((group) => ({
      group,
      tools: tools.filter((tool) => tool.group === group && tool.id !== "owned_abc"),
    }));
  }, [catalog]);

  function studioBlocked(toolId: string): string | null {
    if (toolId === "avatar_presenter") {
      if (!ownedConfirmed) return "Xác nhận bạn sở hữu kịch bản/ảnh.";
      if (!confirmLikeness) return "Xác nhận đây là người ảo hoặc ảnh bạn có quyền.";
      return null;
    }
    if (toolId === "video_translate") {
      if (!ownedConfirmed) return "Xác nhận video là của bạn trước khi dịch.";
      return null;
    }
    if (toolId === "toon_talking_head") {
      if (!ownedConfirmed) return "Xác nhận video là của bạn trước khi tô hoạt hình.";
      if (!confirmFaceEdit) return "Xác nhận được phép sửa mặt người thành hoạt hình.";
      return null;
    }
    if (toolId === "eye_contact") {
      if (!ownedConfirmed) return "Xác nhận video là của bạn.";
      if (!confirmFaceEdit) return "Xác nhận được phép sửa khuôn mặt.";
      return null;
    }
    if (toolId === "overdub") {
      if (!ownedConfirmed) return "Xác nhận video và giọng là của bạn.";
      if (!confirmVoiceClone) return "Xác nhận chỉ clone giọng bạn sở hữu.";
      if (!script.trim()) return "Nhập câu thay thế (script).";
      return null;
    }
    return null;
  }

  async function start(toolId: string) {
    if (toolId === "owned_abc" && !ownedConfirmed) {
      setError("Hãy xác nhận video này là của bạn trước khi chạy gói A+C.");
      return;
    }
    const blocked = studioBlocked(toolId);
    if (blocked) {
      setError(blocked);
      return;
    }
    const startMs = startSec.trim() ? Math.round(Number(startSec) * 1000) : undefined;
    const endMs = endSec.trim() ? Math.round(Number(endSec) * 1000) : undefined;
    setBusyTool(toolId);
    setError(null);
    setMsg(null);
    try {
      await apiPost(
        `/videos/${props.videoId}/ai/edits`,
        {
          tool: toolId,
          options: {
            region,
            style,
            toonStrength,
            ...(script.trim() ? { script: script.trim().slice(0, 4000) } : {}),
            ...(toolId === "video_translate" || toolId === "avatar_presenter" || toolId === "overdub"
              ? { targetLanguage }
              : {}),
            ...(startMs !== undefined && Number.isFinite(startMs) ? { startMs } : {}),
            ...(endMs !== undefined && Number.isFinite(endMs) ? { endMs } : {}),
            ...(toolId === "owned_abc" ||
            toolId === "avatar_presenter" ||
            toolId === "video_translate" ||
            toolId === "eye_contact" ||
            toolId === "toon_talking_head" ||
            toolId === "overdub"
              ? { confirmOwned: true }
              : {}),
            ...(toolId === "avatar_presenter" ? { confirmLikeness: true } : {}),
            ...(toolId === "eye_contact" || toolId === "toon_talking_head" ? { confirmFaceEdit: true } : {}),
            ...(toolId === "overdub" ? { confirmVoiceClone: true } : {}),
          },
        },
        props.token,
      );
      setMsg(
        toolId === "owned_abc"
          ? "Đã xếp gói A+C theo công thức chuyên gia. Đợi làm nét + tiếng xong rồi duyệt."
          : "Đã xếp lệnh chỉnh. Đợi vài giây rồi xem kết quả bên dưới.",
      );
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
        editionVideoId?: string;
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
      const editionHint = result.editionVideoId ? ` Bản minh họa B: ${result.editionVideoId}.` : "";
      setMsg(`Đã áp dụng ${bits}. Duyệt lại trước khi gửi học viên. Nhớ Lưu bài nếu gắn video mới.${editionHint}`);
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
      {props.variant === "advanced" ? (
        <h3>Tùy chỉnh thủ công</h3>
      ) : (
        <h3>4. Chỉnh sửa AI (hình + tiếng)</h3>
      )}
      <p className="muted">
        {props.variant === "advanced"
          ? "Chỉ dùng khi muốn chạy từng công cụ riêng. Luồng tải video đã tự chỉnh và gắn vào bài."
          : "Gói A+C chạy công thức chuyên gia v1: làm nét + lọc tiếng, cắt im lặng, rồi tô người giữa khung thành hoạt hình. Giữ slide và tiếng gốc. Công cụ bên dưới để đổi vùng/độ đậm."}
      </p>
      <p className="ai-edit-legal muted">
        {catalog.ownershipDisclaimer ??
          "Chỉ dùng video bạn sở hữu. Đổi phong cách hay giảm nhạc nền không xóa bản quyền nội dung người khác."}
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
        <span className={`badge ${catalog.capabilities.tts ? "ok" : ""}`}>
          TTS {catalog.capabilities.tts ? "sẵn" : "chưa khóa"}
        </span>
        <span className={`badge ${catalog.capabilities.heygen ? "ok" : ""}`}>
          HeyGen {catalog.capabilities.heygen ? "sẵn" : "chưa khóa"}
        </span>
        <span className={`badge ${catalog.capabilities.elevenlabs ? "ok" : ""}`}>
          ElevenLabs {catalog.capabilities.elevenlabs ? "sẵn" : "chưa khóa"}
        </span>
      </div>
      <div className="ai-edit-options">
        <div>
          <label htmlFor="ai-edit-region">Vùng mặt (C)</label>
          <select
            id="ai-edit-region"
            value={region}
            onChange={(event) => setRegion(event.target.value as FaceRegion)}
          >
            {(Object.keys(REGION_LABEL) as FaceRegion[]).map((value) => (
              <option key={value} value={value}>
                {REGION_LABEL[value]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="ai-edit-style">Phong cách hoạt hình</label>
          <select
            id="ai-edit-style"
            value={style}
            onChange={(event) => setStyle(event.target.value as VisualStyle)}
          >
            {(Object.keys(STYLE_LABEL) as VisualStyle[]).map((value) => (
              <option key={value} value={value}>
                {STYLE_LABEL[value]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="ai-edit-strength">Độ đậm tô hoạt hình</label>
          <select
            id="ai-edit-strength"
            value={toonStrength}
            onChange={(event) => setToonStrength(event.target.value as ToonStrength)}
          >
            {(Object.keys(STRENGTH_LABEL) as ToonStrength[]).map((value) => (
              <option key={value} value={value}>
                {STRENGTH_LABEL[value]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="ai-edit-lang">Ngôn ngữ dịch / TTS</label>
          <select
            id="ai-edit-lang"
            value={targetLanguage}
            onChange={(event) => setTargetLanguage(event.target.value as (typeof TARGET_LANGUAGES)[number]["id"])}
          >
            {TARGET_LANGUAGES.map((row) => (
              <option key={row.id} value={row.id}>
                {row.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="ai-edit-start">Overdub bắt đầu (giây, trống = ~8s cuối)</label>
          <input
            id="ai-edit-start"
            type="number"
            min={0}
            step={0.1}
            value={startSec}
            onChange={(event) => setStartSec(event.target.value)}
          />
        </div>
        <div>
          <label htmlFor="ai-edit-end">Overdub kết thúc (giây)</label>
          <input
            id="ai-edit-end"
            type="number"
            min={0}
            step={0.1}
            value={endSec}
            onChange={(event) => setEndSec(event.target.value)}
          />
        </div>
        <div className="ai-edit-options-wide">
          <label htmlFor="ai-edit-script">Kịch bản / câu thay thế (avatar, overdub)</label>
          <textarea
            id="ai-edit-script"
            maxLength={4000}
            value={script}
            onChange={(event) => setScript(event.target.value)}
            placeholder="Nhập lời người dẫn hoặc câu sửa. Tối đa 4000 ký tự."
          />
        </div>
      </div>
      <div className="ai-edit-consents">
        <label className="ai-edit-owned">
          <input
            type="checkbox"
            checked={confirmLikeness}
            onChange={(event) => setConfirmLikeness(event.target.checked)}
          />
          Avatar: đây là người ảo hoặc ảnh/kịch bản tôi có quyền dùng (không phải mặt người khác).
        </label>
        <label className="ai-edit-owned">
          <input
            type="checkbox"
            checked={confirmFaceEdit}
            onChange={(event) => setConfirmFaceEdit(event.target.checked)}
          />
          Tôi cho phép tô/sửa mặt người trên video này (hoạt hình hoặc canh mắt). Chỉ mặt tôi hoặc người đã đồng ý.
        </label>
        <label className="ai-edit-owned">
          <input
            type="checkbox"
            checked={confirmVoiceClone}
            onChange={(event) => setConfirmVoiceClone(event.target.checked)}
          />
          Overdub: chỉ clone giọng tôi sở hữu, không clone giọng người khác.
        </label>
      </div>
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
            Tôi cam kết chỉ dùng video tôi sở hữu. Đổi phong cách hay giảm nhạc nền không xóa bản quyền nội dung người khác.
          </label>
          <button
            type="button"
            className="ai-edit-tool ai-edit-tool-pack"
            disabled={!packTool.available || busyTool !== null || pending || !ownedConfirmed}
            onClick={() => void start("owned_abc")}
          >
            <strong>{packTool.label}</strong>
            <small>{packTool.description}</small>
            <small>Học từ {packTool.market}</small>
            {packTool.note ? <small>{packTool.note}</small> : null}
            {packTool.mode === "fallback" && packTool.available ? <span className="badge">Bản rút gọn</span> : null}
          </button>
        </div>
      )}

      {grouped.map((block) => (
        <div key={block.group}>
          <h4>{GROUP_LABEL[block.group]}</h4>
          <div className="ai-edit-grid">
            {block.tools.map((tool) => (
              <button
                key={tool.id}
                type="button"
                className="ai-edit-tool"
                disabled={!tool.available || busyTool !== null || pending || Boolean(studioBlocked(tool.id))}
                onClick={() => void start(tool.id)}
              >
                <strong>{tool.label}</strong>
                <small>{tool.description}</small>
                <small>Học từ {tool.market}</small>
                {tool.note ? <small>{tool.note}</small> : null}
                {studioBlocked(tool.id) ? <small>{studioBlocked(tool.id)}</small> : null}
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
                <>
                  {edit.tool === "owned_abc" ? <div className="muted">Bài học A+C</div> : null}
                  <video className="ai-edit-preview" src={edit.previewUrl} controls preload="metadata" />
                </>
              )}
              {edit.status === "READY" && edit.editionPreviewUrl && (
                <>
                  <div className="muted">Bản minh họa B (tiếng gốc)</div>
                  <video className="ai-edit-preview" src={edit.editionPreviewUrl} controls preload="metadata" />
                </>
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

export function LazyVideoAiEditPanel(props: VideoAiEditPanelProps) {
  const [open, setOpen] = useState(false);
  return (
    <details
      className="auto-publish-advanced"
      onToggle={(event) => setOpen((event.currentTarget as HTMLDetailsElement).open)}
    >
      <summary>Tùy chỉnh thủ công</summary>
      {open ? (
        <VideoAiEditPanel {...props} />
      ) : (
        <p className="muted">Mở mục này chỉ khi cần chỉnh từng công cụ. Không mở khi đang tải video tự động.</p>
      )}
    </details>
  );
}
