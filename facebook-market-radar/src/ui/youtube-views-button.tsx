"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { collectJsonHeaders } from "@/ui/collect-headers";
import { CollectKeyField } from "@/ui/collect-key-field";

export function YoutubeViewsButton({ videoCount }: { videoCount: number }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    setError(null);
    setMessage(null);
    const response = await fetch("/api/youtube-views", {
      method: "POST",
      headers: collectJsonHeaders(),
      body: JSON.stringify({}),
    });
    const json = (await response.json()) as {
      error?: string;
      updated?: number;
      skipped?: number;
      videoCount?: number;
      viewsEnterHeat?: boolean;
    };
    setPending(false);
    if (!response.ok) {
      setError(json.error ?? "Không lấy được view");
      return;
    }
    setMessage(
      `Đã ghi ${json.updated ?? 0} cụm, bỏ qua ${json.skipped ?? 0} (trùng). ${json.videoCount ?? 0} video ID từ kho. Views không vào điểm nóng.`,
    );
    router.refresh();
  }

  return (
    <div className="youtube-views-box">
      <CollectKeyField />
      <p className="muted">
        {videoCount} video ID đã có trên thẻ đã lưu. Nút này gọi YouTube Data API (googleapis.com) —
        không mở youtube.com, không bịa view.
      </p>
      <button type="button" className="btn" disabled={pending || videoCount === 0} onClick={() => void onClick()}>
        {pending ? "Đang lấy view…" : "Lấy view YouTube (API chính thức)"}
      </button>
      {error ? <p className="err">{error}</p> : null}
      {message ? <p className="ok">{message}</p> : null}
    </div>
  );
}
