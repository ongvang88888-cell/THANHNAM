"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ApiError, apiPost } from "@/lib/api";

type AdjustEdit = {
  id: string;
  previewUrl: string | null;
  output?: {
    durationMs?: number;
    newVideoId?: string;
    thumbnailStorageKey?: string;
  } | null;
};

function formatClock(ms: number): string {
  const safe = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function friendlyError(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Không chỉnh được đoạn video";
}

export function VideoQuickAdjust(props: {
  token: string;
  videoId: string;
  durationMs?: number;
  previewUrl?: string | null;
  disabled?: boolean;
  variant?: "full" | "row";
  onPreviewError?: () => void;
  onUpdated?: (next: { previewUrl: string | null; durationMs?: number; newVideoId?: string }) => void;
}) {
  const compact = props.variant === "row";
  const videoRef = useRef<HTMLVideoElement>(null);
  const durationMs = props.durationMs && props.durationMs > 0 ? props.durationMs : 8_000;
  const [startMs, setStartMs] = useState(0);
  const [endMs, setEndMs] = useState(durationMs);
  const [busy, setBusy] = useState<"trim" | "thumb" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState(props.previewUrl ?? null);

  useEffect(() => {
    setPreviewUrl(props.previewUrl ?? null);
  }, [props.previewUrl]);

  useEffect(() => {
    if (!props.durationMs || props.durationMs <= 0) return;
    setEndMs((current) => (current === 0 || current > props.durationMs! ? props.durationMs! : current));
  }, [props.durationMs]);

  const span = useMemo(() => Math.max(endMs - startMs, 400), [endMs, startMs]);

  function seekTo(ms: number) {
    const el = videoRef.current;
    if (el) el.currentTime = ms / 1000;
  }

  async function runAdjust(body: { startMs?: number; endMs?: number; thumbSeekSeconds?: number }) {
    return apiPost<AdjustEdit>(`/videos/${props.videoId}/quick-adjust`, body, props.token, { retry429: true });
  }

  async function handleTrim() {
    setBusy("trim");
    setError(null);
    setOk(null);
    try {
      const next = await runAdjust({ startMs, endMs });
      setPreviewUrl(next.previewUrl);
      if (next.output?.durationMs) setEndMs(next.output.durationMs);
      setStartMs(0);
      setOk("Đã cắt đoạn. Xem lại rồi lưu vào bài nếu cần.");
      props.onUpdated?.({
        previewUrl: next.previewUrl,
        durationMs: next.output?.durationMs,
        newVideoId: next.output?.newVideoId,
      });
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(null);
    }
  }

  async function handleThumb() {
    setBusy("thumb");
    setError(null);
    setOk(null);
    try {
      const current = videoRef.current?.currentTime ?? startMs / 1000;
      const next = await runAdjust({ thumbSeekSeconds: current });
      setPreviewUrl(next.previewUrl);
      setOk("Đã đặt ảnh bìa tại khung đang xem.");
      props.onUpdated?.({
        previewUrl: next.previewUrl,
        durationMs: next.output?.durationMs,
        newVideoId: next.output?.newVideoId,
      });
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={`quick-adjust${compact ? " is-row" : ""}`}>
      {!compact && <h4>Chỉnh nhanh sau AI</h4>}
      <p className="muted">{compact ? "Cắt đầu/cuối · ảnh bìa" : "Cắt đầu/cuối và chọn ảnh bìa. Không chạy lại toàn bộ công thức."}</p>
      <div className="quick-adjust-player">
        {previewUrl ? (
          <video
            ref={videoRef}
            className={compact ? "inbox-preview" : "ai-edit-preview"}
            src={previewUrl}
            controls
            preload="metadata"
            onError={() => props.onPreviewError?.()}
          />
        ) : (
          <p className="muted">Chưa lấy được bản xem. Đợi AI xong hoặc tải lại trang.</p>
        )}
      </div>
      <div className="quick-adjust-params">
        <div className="quick-adjust-range">
          <label>
            Bắt đầu {formatClock(startMs)}
            <input
              type="range"
              min={0}
              max={Math.max(durationMs - 400, 0)}
              step={100}
              value={startMs}
              disabled={props.disabled || busy !== null}
              onChange={(event) => {
                const next = Number(event.target.value);
                setStartMs(next);
                if (endMs - next < 400) setEndMs(next + 400);
                seekTo(next);
              }}
            />
          </label>
          <label>
            Kết thúc {formatClock(endMs)} · giữ {formatClock(span)}
            <input
              type="range"
              min={400}
              max={durationMs}
              step={100}
              value={endMs}
              disabled={props.disabled || busy !== null}
              onChange={(event) => {
                const next = Number(event.target.value);
                setEndMs(next);
                if (next - startMs < 400) setStartMs(Math.max(0, next - 400));
                seekTo(next);
              }}
            />
          </label>
        </div>
        <div className="quick-adjust-actions">
          <button type="button" className={compact ? "btn-sm" : undefined} disabled={props.disabled || busy !== null} onClick={() => void handleTrim()}>
            {busy === "trim" ? "Đang cắt…" : compact ? "Cắt đoạn" : "Cắt đoạn đã chọn"}
          </button>
          <button
            type="button"
            className={compact ? "secondary btn-sm" : "secondary"}
            disabled={props.disabled || busy !== null}
            onClick={() => void handleThumb()}
          >
            {busy === "thumb" ? "Đang lấy khung…" : compact ? "Ảnh bìa" : "Đặt ảnh bìa tại đây"}
          </button>
        </div>
        {ok && <p className="ok">{ok}</p>}
        {error && <p className="toast error">{error}</p>}
      </div>
    </div>
  );
}
