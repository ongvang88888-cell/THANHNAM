"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { CourseCard } from "@/components/CourseCard";
import { apiGet } from "@/lib/api";
import type { CatalogCampaign, CatalogProduct } from "@/lib/catalog";
import { UNICA_CATEGORIES } from "@/lib/unica-data";

export default function CategoryPage() {
  const params = useParams<{ slug: string[] }>();
  const parts = params.slug ?? [];
  const catSlug = parts[0] ?? "";
  const childSlug = parts[1];
  const category = UNICA_CATEGORIES.find((row) => row.slug === catSlug);
  const child = category?.children.find((row) => row.slug === childSlug);
  const [items, setItems] = useState<CatalogProduct[]>([]);
  const [campaigns, setCampaigns] = useState<CatalogCampaign[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiGet<{ items: CatalogProduct[] }>("/products?limit=50"),
      apiGet<CatalogCampaign[]>("/campaigns/active").catch(() => []),
    ])
      .then(([catalog, active]) => {
        setItems(catalog.items);
        setCampaigns(active);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Không tải được danh mục"));
  }, []);

  const filtered = useMemo(() => {
    const needle = (childSlug || catSlug).replace(/-/g, " ");
    return items.filter((p) => {
      const hay = `${p.name} ${p.description ?? ""} ${p.category ?? ""} ${p.type}`.toLowerCase();
      return hay.includes(needle) || hay.includes(catSlug.replace(/-/g, " "));
    });
  }, [items, catSlug, childSlug]);

  const matched = filtered.length > 0;
  const shown = matched ? filtered : items;
  const badgeFor = (id: string) =>
    campaigns.find((c) => c.products.some((p) => p.productId === id))?.badgeText;
  const title = child?.name || category?.name || catSlug;

  return (
    <div className="u-wrap">
      <div className="u-crumb" style={{ paddingTop: 18 }}>
        <a href="/">Unica</a>
        <span>/</span>
        <a href="/khoa-hoc">Khóa học</a>
        <span>/</span>
        <span>{title}</span>
      </div>
      <div className="u-page-head">
        <h1>Khóa học {title}</h1>
        <p className="muted">
          {matched
            ? "Chủ đề phổ biến trong danh mục này. Sắp xếp theo học nhiều nhất."
            : "Chưa có khóa đúng chủ đề này — gợi ý các khóa nổi bật trên Unica."}
        </p>
      </div>
      <div className="u-filters">
        {category?.children.map((row) => (
          <a
            key={row.slug}
            className={row.slug === childSlug ? "is-on" : undefined}
            href={`/course/${category.slug}/${row.slug}`}
          >
            {row.name}
          </a>
        ))}
      </div>
      {error && <p className="toast error">{error}</p>}
      <div className="u-grid">
        {shown.map((product) => (
          <CourseCard key={product.id} product={product} badge={badgeFor(product.id)} />
        ))}
      </div>
    </div>
  );
}
