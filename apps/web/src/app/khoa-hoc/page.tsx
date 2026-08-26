"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CourseCard } from "@/components/CourseCard";
import { apiGet } from "@/lib/api";
import { isBundleType, type CatalogCampaign, type CatalogProduct } from "@/lib/catalog";
import { UNICA_CATEGORIES } from "@/lib/unica-data";
import { Suspense } from "react";

function ListingInner() {
  const search = useSearchParams();
  const sort = search.get("sort") ?? "best";
  const type = search.get("type") ?? "all";
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
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Không tải được khóa học"));
  }, []);

  const filtered = useMemo(() => {
    let next = items;
    if (type === "bundle") next = next.filter((p) => isBundleType(p.type));
    if (type === "doc") next = next.filter((p) => p.type === "DIGITAL_DOCUMENT");
    if (type === "course") next = next.filter((p) => p.type === "VIDEO_COURSE");
    if (sort === "sale") {
      next = next.filter((p) => p.price?.compareAtMinor && p.price.compareAtMinor > p.price.amountMinor);
    }
    if (sort === "free") next = next.filter((p) => (p.price?.amountMinor ?? 0) === 0);
    if (sort === "new") next = next.slice();
    return next;
  }, [items, sort, type]);

  const badgeFor = (id: string) =>
    campaigns.find((c) => c.products.some((p) => p.productId === id))?.badgeText;

  return (
    <div className="u-wrap">
      <div className="u-page-head">
        <h1>Tất cả khóa học</h1>
        <p className="muted">Bạn không biết chắc? Tất cả các khóa học đều được đảm bảo hoàn tiền trong 07 ngày</p>
      </div>
      <div className="u-filters">
        <a className={type === "all" ? "is-on" : undefined} href="/khoa-hoc">
          Tất cả
        </a>
        <a className={type === "course" ? "is-on" : undefined} href="/khoa-hoc?type=course">
          Khóa học
        </a>
        <a className={type === "bundle" ? "is-on" : undefined} href="/khoa-hoc?type=bundle">
          Combo
        </a>
        <a className={type === "doc" ? "is-on" : undefined} href="/khoa-hoc?type=doc">
          Sách / tài liệu
        </a>
        <a className={sort === "best" ? "is-on" : undefined} href={`/khoa-hoc?type=${type}&sort=best`}>
          Học nhiều nhất
        </a>
        <a className={sort === "sale" ? "is-on" : undefined} href={`/khoa-hoc?type=${type}&sort=sale`}>
          Siêu ưu đãi
        </a>
        <a className={sort === "new" ? "is-on" : undefined} href={`/khoa-hoc?type=${type}&sort=new`}>
          Mới ra mắt
        </a>
      </div>
      <div className="u-filters">
        {UNICA_CATEGORIES.slice(0, 8).map((cat) => (
          <a key={cat.slug} href={`/course/${cat.slug}`}>
            {cat.name}
          </a>
        ))}
      </div>
      {error && <p className="toast error">{error}</p>}
      {filtered.length === 0 && !error && <p className="u-empty">Chưa có khóa học phù hợp.</p>}
      <div className="u-grid">
        {filtered.map((product) => (
          <CourseCard key={product.id} product={product} badge={badgeFor(product.id)} />
        ))}
      </div>
    </div>
  );
}

export default function CourseListingPage() {
  return (
    <Suspense fallback={<p className="u-wrap muted">Đang tải khóa học…</p>}>
      <ListingInner />
    </Suspense>
  );
}
