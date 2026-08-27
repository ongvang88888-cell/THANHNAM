"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";

type Tip = { id: string; title: string; body: string; topicCode?: string };

export default function GplxTipsPage() {
  const { token, ready } = useRequireAuth();
  const [items, setItems] = useState<Tip[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !token) return;
    apiGet<{ items: Tip[] }>("/gplx/tips", token)
      .then((r) => setItems(r.items))
      .catch((e) => setError(e instanceof Error ? e.message : "Lỗi"));
  }, [ready, token]);

  return (
    <section>
      <p className="muted">
        <a href="/gplx">Ôn GPLX</a> · Mẹo
      </p>
      <h1 style={{ fontFamily: "var(--font-display)" }}>Mẹo ghi nhớ</h1>
      {error && <p className="error">{error}</p>}
      {items.map((t) => (
        <div className="panel" key={t.id} style={{ marginBottom: 12 }}>
          <h3 style={{ marginTop: 0 }}>{t.title}</h3>
          <p className="muted" style={{ marginBottom: 0 }}>
            {t.body}
          </p>
        </div>
      ))}
    </section>
  );
}
