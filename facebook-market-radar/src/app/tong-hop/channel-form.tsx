"use client";

import { useState } from "react";
import { CHANNEL_METRIC_META, CHANNEL_METRIC_SOURCES } from "@/domain/sales-channels";
import { collectJsonHeaders } from "@/ui/collect-headers";
import { CollectKeyField } from "@/ui/collect-key-field";

export function ChannelObservationForm({
  clusters,
}: {
  clusters: Array<{ slug: string; title: string }>;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/kenh", {
      method: "POST",
      headers: collectJsonHeaders(),
      body: JSON.stringify({
        clusterSlug: String(form.get("clusterSlug") ?? ""),
        source: String(form.get("source") ?? ""),
        value: Number(String(form.get("value") ?? "")),
      }),
    });
    const json = (await response.json()) as { error?: string; source?: string; value?: number };
    setPending(false);
    if (!response.ok) {
      setError(json.error ?? "Không lưu được chỉ số");
      return;
    }
    setMessage(`Đã ghi ${json.source} = ${json.value}`);
  }

  if (clusters.length === 0) {
    return <p className="muted">Chưa có sản phẩm trong kho — lưu thẻ ads trước khi nhập chỉ số kênh.</p>;
  }

  return (
    <form className="stack" onSubmit={(event) => void onSubmit(event)}>
      <CollectKeyField />
      <label>
        Sản phẩm đã lưu
        <select name="clusterSlug" required>
          {clusters.map((cluster) => (
            <option key={cluster.slug} value={cluster.slug}>
              {cluster.title}
            </option>
          ))}
        </select>
      </label>
      <label>
        Chỉ số
        <select name="source" defaultValue="SHOPEE">
          {CHANNEL_METRIC_SOURCES.map((source) => (
            <option key={source} value={source}>
              {CHANNEL_METRIC_META[source].labelVi}
            </option>
          ))}
        </select>
      </label>
      <label>
        Số (nguyên, bạn tự đọc trên trang chính thức)
        <input name="value" inputMode="numeric" required />
      </label>
      <button type="submit" disabled={pending}>
        {pending ? "Đang ghi…" : "Ghi chỉ số kênh"}
      </button>
      {error ? <p className="err">{error}</p> : null}
      {message ? <p className="ok">{message}</p> : null}
    </form>
  );
}
