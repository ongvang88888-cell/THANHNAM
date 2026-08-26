"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";

type LibraryProduct = {
  id: string;
  name: string;
  slug: string;
  type: string;
  course?: { id: string } | null;
  document?: { id: string } | null;
  firstLessonId?: string | null;
};

function hrefFor(p: LibraryProduct): string {
  if (p.type === "DIGITAL_DOCUMENT" && p.document?.id) {
    return `/documents/${p.document.id}`;
  }
  if (p.type === "VIDEO_COURSE" && p.firstLessonId) {
    return `/learn/${p.firstLessonId}`;
  }
  return `/products/${p.slug}`;
}

export default function LibraryPage() {
  const { token, user, ready, logout } = useRequireAuth();
  const [data, setData] = useState<{
    products: LibraryProduct[];
    continueLearning?: Array<{ lessonId: string; lessonTitle: string; courseTitle: string }>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !token) return;
    setError(null);
    Promise.all([
      apiGet<{ products: LibraryProduct[] }>("/me/library", token),
      apiGet<Array<{ lessonId: string; lessonTitle: string; courseTitle: string }>>(
        "/me/continue",
        token,
      ),
    ])
      .then(([library, cont]) => setData({ ...library, continueLearning: cont }))
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Không tải được thư viện");
      });
  }, [ready, token]);

  if (!ready || !user) return <p className="muted">Loading...</p>;

  return (
    <section>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", marginBottom: 4 }}>Thư viện</h1>
          <p className="muted">
            {user.displayName || user.email} · {user.roles.join(", ")}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a className="btn secondary" href="/certificates">
            Chứng chỉ
          </a>
          <a className="btn secondary" href="/invoices">
            Hóa đơn
          </a>
          <button className="secondary" onClick={() => void logout()}>
            Đăng xuất
          </button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <h2 style={{ fontFamily: "var(--font-display)" }}>Continue Learning</h2>
      <div className="panel">
        {(data?.continueLearning?.length ?? 0) === 0 && <p className="muted">Chưa có tiến độ.</p>}
        <ul className="lesson-list">
          {data?.continueLearning?.map((c) => (
            <li key={c.lessonId}>
              <a href={`/learn/${c.lessonId}`}>
                {c.courseTitle} — {c.lessonTitle}
              </a>
            </li>
          ))}
        </ul>
      </div>

      <h2 style={{ fontFamily: "var(--font-display)" }}>Owned products</h2>
      <div className="grid">
        {data?.products.map((p) => (
          <a className="product" key={p.id} href={hrefFor(p)}>
            <div className="type">{p.type}</div>
            <h3>{p.name}</h3>
            <p className="muted">
              {p.type === "DIGITAL_DOCUMENT"
                ? "Open document"
                : p.type.includes("BUNDLE")
                  ? "Open bundle"
                  : "Open course"}
            </p>
          </a>
        ))}
      </div>
    </section>
  );
}
