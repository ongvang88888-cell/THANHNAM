"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";

type Hit = {
  id: string;
  stem: string;
  isCritical: boolean;
  officialNo: number | null;
  topicTitle: string;
  bookmarked: boolean;
};

export default function GplxSearchPage() {
  const { token, ready } = useRequireAuth();
  const [licenseClass, setLicenseClass] = useState("B");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Hit[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const lc = sp.get("licenseClass");
    if (lc) setLicenseClass(lc);
    const qq = sp.get("q");
    if (qq) setQ(qq);
  }, []);

  useEffect(() => {
    if (!ready || !token || q.trim().length < 2) {
      setItems([]);
      return;
    }
    const t = setTimeout(() => {
      apiGet<{ items: Hit[] }>(
        `/gplx/search?q=${encodeURIComponent(q.trim())}&licenseClass=${licenseClass}`,
        token,
      )
        .then((res) => setItems(res.items ?? []))
        .catch((e) => setError(e instanceof Error ? e.message : "Lỗi"));
    }, 250);
    return () => clearTimeout(t);
  }, [ready, token, q, licenseClass]);

  async function toggleBookmark(item: Hit) {
    if (!token) return;
    try {
      if (item.bookmarked) {
        await apiDelete(`/gplx/bookmarks/${item.id}`, token);
        setItems((prev) =>
          prev.map((x) => (x.id === item.id ? { ...x, bookmarked: false } : x)),
        );
      } else {
        await apiPost("/gplx/bookmarks", { questionId: item.id }, token);
        setItems((prev) =>
          prev.map((x) => (x.id === item.id ? { ...x, bookmarked: true } : x)),
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu bookmark");
    }
  }

  if (!ready) return <p className="muted">Đang tải…</p>;

  return (
    <section>
      <p className="muted">
        <a href={`/gplx?licenseClass=${licenseClass}`}>← GPLX</a>
      </p>
      <h1 style={{ fontFamily: "var(--font-display)" }}>Tìm câu hỏi</h1>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Nhập từ khóa hoặc số câu…"
        style={{ width: "100%", maxWidth: 480, padding: "10px 12px", marginBottom: 16 }}
      />
      {error && <p className="error">{error}</p>}
      <ul className="lesson-list">
        {items.map((item) => (
          <li key={item.id} style={{ flexDirection: "column", alignItems: "stretch" }}>
            <p style={{ margin: "0 0 8px" }}>
              {item.officialNo != null ? `#${item.officialNo} · ` : ""}
              {item.stem}
              {item.isCritical ? " · Liệt" : ""}
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span className="muted">{item.topicTitle}</span>
              <button
                type="button"
                className="secondary"
                onClick={() => void toggleBookmark(item)}
              >
                {item.bookmarked ? "Bỏ bookmark" : "Bookmark"}
              </button>
            </div>
          </li>
        ))}
      </ul>
      {q.trim().length >= 2 && items.length === 0 && !error && (
        <p className="muted">Không có kết quả.</p>
      )}
    </section>
  );
}
