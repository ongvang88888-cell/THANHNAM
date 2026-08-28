"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CollectQueueItem } from "@/domain/platform-dashboards";
import type { ChannelMetricSource } from "@/domain/sales-channels";
import { collectJsonHeaders } from "@/ui/collect-headers";
import { CollectKeyField } from "@/ui/collect-key-field";

export function CollectQueue({
  tabLabel,
  items,
  source,
}: {
  tabLabel: string;
  items: readonly CollectQueueItem[];
  source: ChannelMetricSource | null;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <p className="muted">
        Mọi sản phẩm trong kho đã có số {tabLabel}, hoặc chưa có cụm để nhập.
      </p>
    );
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>, item: CollectQueueItem) {
    event.preventDefault();
    if (!source) {
      return;
    }
    const form = event.currentTarget;
    const value = Number(String(new FormData(form).get("value") ?? ""));
    setPendingSlug(item.clusterSlug);
    setError(null);
    setMessage(null);
    const response = await fetch("/api/kenh", {
      method: "POST",
      headers: collectJsonHeaders(),
      body: JSON.stringify({
        clusterSlug: item.clusterSlug,
        source,
        value,
      }),
    });
    const json = (await response.json()) as { error?: string; value?: number };
    setPendingSlug(null);
    if (!response.ok) {
      setError(json.error ?? "Không lưu được chỉ số");
      return;
    }
    setMessage(`Đã ghi ${item.clusterTitle} = ${json.value}`);
    form.reset();
    router.refresh();
  }

  return (
    <section className="collect-queue">
      <h2>Hàng đợi nhập số {tabLabel}</h2>
      <p className="muted">
        Ưu tiên sản phẩm đã có đích trên thẻ. Mở URL đã lưu hoặc trang chính thức, đọc số, ghi vào kho.
        Radar không tự kéo sàn.
      </p>
      {source ? <CollectKeyField /> : null}
      {error ? <p className="err">{error}</p> : null}
      {message ? <p className="ok">{message}</p> : null}
      <ol className="collect-queue-list">
        {items.map((item) => (
          <li key={item.clusterSlug} className="collect-queue-item">
            <div>
              <strong>{item.clusterTitle}</strong>
              <div className="muted">
                {item.nicheName} · {item.fbActiveAds} ads FB · nóng {item.fbHeat}
              </div>
              <div className="chip-row">
                {item.reason === "has_landing" ? (
                  <span className="badge">Có đích đã lưu</span>
                ) : (
                  <span className="badge warn">Chưa có đích / chưa có số</span>
                )}
              </div>
              <div className="queue-links">
                {item.savedLandingUrl ? (
                  <a href={item.savedLandingUrl} target="_blank" rel="noreferrer">
                    Mở đích đã lưu
                  </a>
                ) : null}
                <a href={item.researchUrl} target="_blank" rel="noreferrer">
                  Trang chính thức
                </a>
              </div>
            </div>
            {source ? (
              <form
                className="queue-form"
                onSubmit={(event) => {
                  void onSubmit(event, item);
                }}
              >
                <input name="value" inputMode="numeric" required placeholder="Số bạn đọc" />
                <button type="submit" disabled={pendingSlug === item.clusterSlug}>
                  {pendingSlug === item.clusterSlug ? "Đang ghi…" : "Ghi"}
                </button>
              </form>
            ) : (
              <p className="muted">Lưu thêm thẻ Facebook — kênh này không nhập “đã bán”.</p>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
