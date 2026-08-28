"use client";

import { useState } from "react";
import { collectJsonHeaders } from "@/ui/collect-headers";
import { CollectKeyField } from "@/ui/collect-key-field";

type Watch = { pageId: string; pageName: string | null; note: string | null };

export function PageWatchPanel({ initialWatches }: { initialWatches: Watch[] }) {
  const [watches, setWatches] = useState(initialWatches);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/theo-doi-trang", {
      method: "POST",
      headers: collectJsonHeaders(),
      body: JSON.stringify({
        pageId: String(form.get("pageId") ?? "").trim(),
        pageName: String(form.get("pageName") ?? "").trim() || null,
        note: String(form.get("note") ?? "").trim() || null,
      }),
    });
    const json = (await response.json()) as { error?: string; watch?: Watch };
    if (!response.ok || !json.watch) {
      setError(json.error ?? "Không theo dõi được");
      return;
    }
    setWatches((prev) => [json.watch!, ...prev.filter((row) => row.pageId !== json.watch!.pageId)]);
    event.currentTarget.reset();
  }

  async function remove(pageId: string) {
    setError(null);
    const response = await fetch("/api/theo-doi-trang", {
      method: "DELETE",
      headers: collectJsonHeaders(),
      body: JSON.stringify({ pageId }),
    });
    const json = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(json.error ?? "Không xóa được");
      return;
    }
    setWatches((prev) => prev.filter((row) => row.pageId !== pageId));
  }

  return (
    <section className="stack">
      <h2>Theo dõi trang (Watch Page)</h2>
      <p className="muted">
        Khi bạn lưu thêm thẻ từ trang này, Radar tạo cảnh báo. Không crawl 24/7, không tự mở Thư viện.
      </p>
      <CollectKeyField />
      <form className="stack" onSubmit={(event) => void onSubmit(event)}>
        <label>
          Mã trang Facebook
          <input name="pageId" placeholder="900021" required />
        </label>
        <label>
          Tên trang
          <input name="pageName" />
        </label>
        <label>
          Ghi chú
          <input name="note" />
        </label>
        <button type="submit">Theo dõi trang</button>
      </form>
      {error ? <p className="err">{error}</p> : null}
      {watches.length === 0 ? <p className="muted">Chưa theo dõi trang nào.</p> : null}
      <ul>
        {watches.map((watch) => (
          <li key={watch.pageId}>
            {watch.pageName || watch.pageId} ({watch.pageId}){" "}
            <button type="button" className="secondary" onClick={() => void remove(watch.pageId)}>
              Bỏ theo dõi
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
