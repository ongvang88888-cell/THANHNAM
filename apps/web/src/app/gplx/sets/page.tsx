"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";
import { GplxCrumb } from "@/components/gplx/GplxChrome";

type SetItem = {
  id: string;
  code: string;
  title: string;
  licenseClass: string;
  questionCount: number;
  position: number;
};

export default function GplxFixedSetsPage() {
  const { token, ready } = useRequireAuth();
  const [licenseClass, setLicenseClass] = useState("B");
  const [items, setItems] = useState<SetItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState<string | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("licenseClass");
    if (q) setLicenseClass(q);
  }, []);

  useEffect(() => {
    if (!ready || !token) return;
    apiGet<{ items?: SetItem[] } | SetItem[]>(
      `/gplx/fixed-sets?licenseClass=${licenseClass}`,
      token,
    )
      .then((res) => setItems(Array.isArray(res) ? res : res.items ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : "Lỗi"));
  }, [ready, token, licenseClass]);

  async function start(setId: string) {
    if (!token) return;
    setStarting(setId);
    setError(null);
    try {
      const res = await apiPost<{ attemptId: string }>(
        "/gplx/mock/start",
        { licenseClass, mode: "fixed", fixedSetId: setId },
        token,
      );
      window.location.href = `/gplx/exam/${res.attemptId}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không bắt đầu được");
      setStarting(null);
    }
  }

  if (!ready) return <p className="muted">Đang tải…</p>;

  return (
    <div className="gx-page">
      <GplxCrumb licenseClass={licenseClass} trail={[{ label: "Bộ đề cố định" }]} />
      <h1 style={{ fontFamily: "var(--font-display)", letterSpacing: "0", marginTop: 0 }}>
        Bộ đề cố định
      </h1>
      <p className="muted">
        Luyện lại cùng một đề nhiều lần (kiểu danh sách đề sẵn có trên app ôn GPLX phổ biến).
      </p>
      {error && <p className="error">{error}</p>}
      {items.map((s) => (
        <div
          className="panel"
          key={s.id}
          style={{
            marginBottom: 10,
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div>
            <strong style={{ fontFamily: "var(--font-display)", letterSpacing: "0" }}>
              {s.title}
            </strong>
            <span className="muted">
              {" "}
              · {s.licenseClass} · {s.questionCount} câu
            </span>
          </div>
          <button
            type="button"
            disabled={starting === s.id}
            onClick={() => void start(s.id)}
          >
            {starting === s.id ? "…" : "Làm đề"}
          </button>
        </div>
      ))}
      {items.length === 0 && !error && <p className="muted">Chưa có bộ đề cho hạng này.</p>}
    </div>
  );
}
