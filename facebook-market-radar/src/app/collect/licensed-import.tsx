"use client";

import { useState } from "react";
import { collectJsonHeaders } from "@/ui/collect-headers";
import { CollectKeyField } from "@/ui/collect-key-field";

export function LicensedImportForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    const formEl = event.currentTarget;
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);
    const json = new FormData(formEl).get("json");
    const raw = typeof json === "string" ? json.trim() : "";
    const response = await fetch("/api/licensed/import", {
      method: "POST",
      headers: collectJsonHeaders(),
      body: raw.length > 0 ? raw : "",
    });
    const payload = (await response.json()) as {
      error?: string;
      imported?: number;
      failed?: number;
      mode?: string;
    };
    setPending(false);
    if (!response.ok) {
      setError(payload.error ?? "Không nhập được feed");
      return;
    }
    setMessage(
      `Đã nhập ${payload.imported ?? 0} thẻ (mode ${payload.mode ?? "licensed"}; lỗi ${payload.failed ?? 0}).`,
    );
  }

  return (
    <form className="stack" onSubmit={(event) => void onSubmit(event)}>
      <CollectKeyField />
      <p className="muted">
        Dán JSON đã mua (<code>ads[]</code> / <code>items[]</code> / Meta <code>data[]</code>), hoặc để trống để
        đọc <code>FMR_LICENSED_FEED_URL</code> (https vendor) rồi <code>FMR_LICENSED_FEED_PATH</code>. Không
        crawl Ad Library. Host Facebook bị từ chối.
      </p>
      <label>
        JSON feed (tuỳ chọn)
        <textarea name="json" rows={8} placeholder='{"ads":[{"libraryId":"…","pageId":"…","pageName":"…","startDate":"2026-08-01","productHint":"Serum"}]}' />
      </label>
      <button type="submit" disabled={pending}>
        {pending ? "Đang nhập…" : "Nhập feed đã mua"}
      </button>
      {error ? <p className="err">{error}</p> : null}
      {message ? <p className="ok">{message}</p> : null}
    </form>
  );
}
