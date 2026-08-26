"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";
import { coverStyle } from "@/lib/catalog";
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
  if (p.type === "DIGITAL_DOCUMENT" && p.document?.id) return `/documents/${p.document.id}`;
  if (p.type === "VIDEO_COURSE" && p.firstLessonId) return `/learn/${p.firstLessonId}`;
  return `/products/${p.slug}`;
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

  if (!ready || !user) return <p className="u-wrap muted">Đang mở khóa học của tôi…</p>;

  return (
    <div className="u-wrap">
      <div className="u-page-head">
        <h1>Khóa học của tôi</h1>
        <p className="muted">{user.displayName || user.email}</p>
      </div>
      {error && <p className="toast error">{error}</p>}

      <section className="u-rail">
        <div className="u-rail-head">
          <h2>Tiếp tục học</h2>
        </div>
        <div className="u-grid">
          {(data?.continueLearning?.length ?? 0) === 0 && (
            <p className="muted">Chưa có tiến độ. Mua một khóa hoặc mở bài học thử để bắt đầu.</p>
          )}
          {data?.continueLearning?.map((row) => (
            <a className="u-card" key={row.lessonId} href={`/learn/${row.lessonId}`}>
              <div className="u-card-cover" style={coverStyle(row.courseTitle)}>
                {row.courseTitle.slice(0, 1)}
              </div>
              <div className="u-card-body">
                <h3>{row.courseTitle}</h3>
                <p className="u-card-teacher">{row.lessonTitle}</p>
                <div className="u-price">
                  <strong>Vào bài →</strong>
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="u-rail">
        <div className="u-rail-head">
          <h2>Đã sở hữu</h2>
        </div>
        <div className="u-grid">
          {data?.products.map((p) => (
            <a className="u-card" key={p.id} href={hrefFor(p)}>
              <div className="u-card-cover" style={coverStyle(p.slug)}>
                {p.name.slice(0, 1)}
              </div>
              <div className="u-card-body">
                <h3>{p.name}</h3>
                <p className="u-card-teacher">{productTypeLabel(p.type)}</p>
                <div className="u-price">
                  <strong>Tiếp tục học</strong>
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
