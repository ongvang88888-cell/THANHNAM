"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CourseCard } from "@/components/CourseCard";
import { SearchBox } from "@/components/SearchBox";
import { apiGet } from "@/lib/api";
import { asCatalogProduct, type CatalogProduct } from "@/lib/catalog";

function SearchInner() {
  const search = useSearchParams();
  const q = search.get("q") ?? "";
  const [items, setItems] = useState<CatalogProduct[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!q.trim()) {
      setItems([]);
      return;
    }
    apiGet<{ items: Array<Parameters<typeof asCatalogProduct>[0]> }>(`/search?q=${encodeURIComponent(q)}`)
      .then((res) => setItems(res.items.map(asCatalogProduct)))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Không tìm được khóa học"));
  }, [q]);

  return (
    <div className="u-wrap">
      <div className="u-page-head">
        <h1>Tìm khóa học, giảng viên</h1>
        <SearchBox />
      </div>
      {q && <p className="muted">Kết quả cho “{q}”</p>}
      {error && <p className="toast error">{error}</p>}
      {q && items.length === 0 && !error && <p className="u-empty">Không tìm thấy khóa học phù hợp.</p>}
      <div className="u-grid">
        {items.map((product) => (
          <CourseCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<p className="u-wrap muted">Đang tìm…</p>}>
      <SearchInner />
    </Suspense>
  );
}
