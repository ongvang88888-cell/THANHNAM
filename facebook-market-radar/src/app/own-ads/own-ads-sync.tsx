"use client";

import { useState } from "react";

export function OwnAdsSync() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function sync() {
    setError(null);
    setMessage(null);
    const response = await fetch("/api/own-ads/sync", { method: "POST" });
    const json = (await response.json()) as { error?: string; imported?: number };
    if (!response.ok) {
      setError(json.error ?? "Sync thất bại");
      return;
    }
    setMessage(`Đã nhập ${json.imported ?? 0} dòng insights`);
  }

  return (
    <div>
      <p className="muted">
        Không có <code>META_ACCESS_TOKEN</code> thì sync dùng fixture local — không gọi Graph.
      </p>
      <button type="button" onClick={() => void sync()}>
        Sync Marketing API / fixture
      </button>
      {error ? <p className="err">{error}</p> : null}
      {message ? <p className="ok">{message}</p> : null}
    </div>
  );
}
