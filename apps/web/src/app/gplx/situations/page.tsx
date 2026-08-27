"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";
import { GplxCrumb } from "@/components/gplx/GplxChrome";
import { GplxFigure } from "@/components/gplx/GplxFigure";

type Situation = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
};

export default function GplxSituationsPage() {
  const { token, ready } = useRequireAuth();
  const [licenseClass, setLicenseClass] = useState("B");
  const [items, setItems] = useState<Situation[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const lc = sp.get("licenseClass");
    if (lc) setLicenseClass(lc);
  }, []);

  useEffect(() => {
    if (!ready || !token) return;
    apiGet<{ items: Situation[] }>("/gplx/situations", token)
      .then((r) => setItems(r.items))
      .catch((e) => setError(e instanceof Error ? e.message : "Lỗi"));
  }, [ready, token]);

  return (
    <div className="gx-page">
      <GplxCrumb licenseClass={licenseClass} trail={[{ label: "Tình huống" }]} />
      <h1 style={{ fontFamily: "var(--font-display)", letterSpacing: "0", marginTop: 0 }}>
        Minh họa tình huống giao thông
      </h1>
      <p className="muted">
        Sơ đồ giáo dục gốc (không phải ảnh đề thi chính thức). Dùng để nhớ quy tắc ưu tiên,
        đèn tín hiệu, vượt, đường sắt…{" "}
        <a href={`/gplx/signs?licenseClass=${licenseClass}`}>Thư viện biển báo →</a>
      </p>
      {error && <p className="error">{error}</p>}
      <div style={{ display: "grid", gap: 14 }}>
        {items.map((s) => (
          <div className="panel" key={s.id}>
            <GplxFigure src={s.imageUrl} alt={s.title} size="lg" />
            <strong style={{ fontFamily: "var(--font-display)" }}>{s.title}</strong>
            <p className="muted" style={{ marginBottom: 0 }}>
              {s.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
