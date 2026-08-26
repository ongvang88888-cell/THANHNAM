"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";
import { productTypeLabel } from "@/lib/labels";

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

function actionLabel(type: string): string {
  if (type === "DIGITAL_DOCUMENT") return "Mở tài liệu";
  if (type.includes("BUNDLE")) return "Mở combo";
  return "Tiếp tục học";
}

export default function LibraryPage() {
  const { token, user, ready } = useRequireAuth();
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

  if (!ready || !user) return <p className="muted">Đang mở thư viện…</p>;

  return (
    <section>
      <div className="page-head">
        <h1>Thư viện của tôi</h1>
        <p className="muted">{user.displayName || user.email}</p>
      </div>

      {error && <p className="toast error">{error}</p>}

      <h2 style={{ fontFamily: "var(--font-display)", color: "var(--brand)" }}>Tiếp tục học</h2>
      <div className="grid" style={{ marginBottom: 28 }}>
        {(data?.continueLearning?.length ?? 0) === 0 && (
          <div className="panel">
            <p className="muted">Chưa có tiến độ. Mua một khóa hoặc mở bài xem trước để bắt đầu.</p>
          </div>
        )}
        {data?.continueLearning?.map((c) => (
          <a className="product" key={c.lessonId} href={`/learn/${c.lessonId}`}>
            <div className="type">Đang học</div>
            <h3>{c.courseTitle}</h3>
            <p className="muted">{c.lessonTitle}</p>
            <div className="price">Vào bài →</div>
          </a>
        ))}
      </div>

      <h2 style={{ fontFamily: "var(--font-display)", color: "var(--brand)" }}>Đã sở hữu</h2>
      <div className="grid">
        {data?.products.map((p) => (
          <a className="product" key={p.id} href={hrefFor(p)}>
            <div className="cover" />
            <div className="type">{productTypeLabel(p.type)}</div>
            <h3>{p.name}</h3>
            <p className="muted">{actionLabel(p.type)}</p>
          </a>
        ))}
      </div>
    </section>
  );
}
