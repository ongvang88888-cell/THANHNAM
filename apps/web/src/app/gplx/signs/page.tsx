"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";
import { GplxCrumb } from "@/components/gplx/GplxChrome";
import { GplxFigure } from "@/components/gplx/GplxFigure";

type Sign = {
  id: string;
  code: string;
  name: string;
  group: string;
  meaning: string;
  imageUrl?: string;
  source?: string;
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
  const [licenseClass, setLicenseClass] = useState("B");
  const [items, setItems] = useState<Sign[]>([]);
  const [group, setGroup] = useState("all");
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const lc = sp.get("licenseClass");
    if (lc) setLicenseClass(lc);
  }, []);

  useEffect(() => {
    if (!ready || !token) return;
    const qs = q.trim().length >= 2 ? `?q=${encodeURIComponent(q.trim())}` : "";
    apiGet<{ items: Sign[] }>(`/gplx/signs${qs}`, token)
      .then((r) => setItems(r.items))
      .catch((e) => setError(e instanceof Error ? e.message : "Lỗi"));
  }, [ready, token, q]);

  const filtered = useMemo(
    () => (group === "all" ? items : items.filter((s) => s.group === group)),
    [items, group],
  );

  return (
    <div className="gx-page">
      <GplxCrumb licenseClass={licenseClass} trail={[{ label: "Biển báo" }]} />
      <h1 style={{ fontFamily: "var(--font-display)", letterSpacing: "0", marginTop: 0 }}>
        Thư viện biển báo
      </h1>
      <p className="muted">
        {filtered.length} biển có hình minh họa (QCVN 41 / Wikimedia Commons).{" "}
        <a href={`/gplx/situations?licenseClass=${licenseClass}`}>Xem tình huống giao thông →</a>
      </p>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Tìm theo mã / tên / ý nghĩa…"
        style={{ width: "100%", maxWidth: 420, padding: "10px 12px", marginBottom: 12 }}
      />
      <div className="gx-class-bar" style={{ marginBottom: 16 }}>
        {GROUPS.map((g) => (
          <button
            key={g.id}
            type="button"
            className={`gx-chip${group === g.id ? " on" : ""}`}
            onClick={() => setGroup(g.id)}
          >
            {g.label}
          </button>
        ))}
      </div>
      <p style={{ marginBottom: 16 }}>
        <a className="btn secondary" href="/gplx/flashcards?kind=signs">
          Học flashcard biển báo
        </a>
      </p>
      {error && <p className="error">{error}</p>}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 12,
        }}
      >
        {filtered.map((s) => (
          <div className="panel" key={s.id} style={{ marginBottom: 0 }}>
            <GplxFigure src={s.imageUrl} alt={`Biển ${s.code} ${s.name}`} size="md" />
            <strong style={{ fontFamily: "var(--font-display)", letterSpacing: "0" }}>
              {s.code} — {s.name}
            </strong>
            <p className="muted" style={{ marginBottom: 0 }}>
              {s.meaning}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
