"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";

type Sign = {
  id: string;
  code: string;
  name: string;
  group: string;
  meaning: string;
};

const GROUPS: Array<{ id: string; label: string }> = [
  { id: "all", label: "Tất cả" },
  { id: "cam", label: "Cấm" },
  { id: "nguy_hiem", label: "Nguy hiểm" },
  { id: "hieu_lenh", label: "Hiệu lệnh" },
  { id: "chi_dan", label: "Chỉ dẫn" },
  { id: "phu", label: "Biển phụ" },
];

export default function GplxSignsPage() {
  const { token, ready } = useRequireAuth();
  const [items, setItems] = useState<Sign[]>([]);
  const [group, setGroup] = useState("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !token) return;
    apiGet<{ items: Sign[] }>("/gplx/signs", token)
      .then((r) => setItems(r.items))
      .catch((e) => setError(e instanceof Error ? e.message : "Lỗi"));
  }, [ready, token]);

  const filtered = useMemo(
    () => (group === "all" ? items : items.filter((s) => s.group === group)),
    [items, group],
  );

  return (
    <section>
      <p className="muted">
        <a href="/gplx">Ôn GPLX</a> · Biển báo
      </p>
      <h1 style={{ fontFamily: "var(--font-display)" }}>Thư viện biển báo</h1>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {GROUPS.map((g) => (
          <button
            key={g.id}
            type="button"
            className={group === g.id ? "" : "secondary"}
            onClick={() => setGroup(g.id)}
          >
            {g.label}
          </button>
        ))}
      </div>
      {error && <p className="error">{error}</p>}
      {filtered.map((s) => (
        <div className="panel" key={s.id} style={{ marginBottom: 10 }}>
          <strong>
            {s.code} — {s.name}
          </strong>
          <p className="muted" style={{ marginBottom: 0 }}>
            {s.meaning}
          </p>
        </div>
      ))}
    </section>
  );
}
