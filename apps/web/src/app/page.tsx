"use client";

import { useEffect, useMemo, useState } from "react";
import { CourseRail } from "@/components/CourseRail";
import { apiGet } from "@/lib/api";
import {
  coverStyle,
  isBundleType,
  isCourseType,
  type CatalogCampaign,
  type CatalogProduct,
} from "@/lib/catalog";
import { FEATURED_TEACHERS, HERO_SLIDES, LIVE_CLASSES, QUICK_LINKS } from "@/lib/unica-data";

export default function HomePage() {
  const [items, setItems] = useState<CatalogProduct[]>([]);
  const [campaigns, setCampaigns] = useState<CatalogCampaign[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiGet<{ items: CatalogProduct[] }>("/products?limit=50"),
      apiGet<CatalogCampaign[]>("/campaigns/active").catch(() => []),
    ])
      .then(([catalog, active]) => {
        if (cancelled) return;
        setItems(catalog.items);
        setCampaigns(active);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Không tải được cửa hàng");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSlide((i) => (i + 1) % HERO_SLIDES.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, []);

  const current = HERO_SLIDES[slide] ?? HERO_SLIDES[0];
  const courses = useMemo(() => items.filter((p) => isCourseType(p.type)), [items]);
  const bundles = useMemo(() => items.filter((p) => isBundleType(p.type)), [items]);
  const docs = useMemo(() => items.filter((p) => p.type === "DIGITAL_DOCUMENT"), [items]);
  const free = useMemo(() => items.filter((p) => (p.price?.amountMinor ?? 0) === 0), [items]);
  const sale = useMemo(
    () =>
      items.filter(
        (p) => p.price?.compareAtMinor && p.price.compareAtMinor > p.price.amountMinor,
      ),
    [items],
  );
  const newest = items.slice(0, 8);
  const best = (courses.length ? courses : items).slice(0, 8);
  const watching = items.slice().reverse().slice(0, 8);
  const weekly = items.slice(2, 10);

  return (
    <>
      <section className="u-hero">
        {current && (
          <div className="u-slide">
            <div>
              <span className="u-kicker">{current.kicker}</span>
              <h1>{current.title}</h1>
              <p>{current.subtitle}</p>
              <a className="btn" href={current.href}>
                {current.cta}
              </a>
            </div>
            <div className={`u-slide-art ${current.tone}`}>
              <span>unica</span>
            </div>
          </div>
        )}
        <div className="u-hero-dots">
          {HERO_SLIDES.map((row, i) => (
            <button
              key={row.id}
              type="button"
              className={i === slide ? "is-on" : undefined}
              aria-label={`Slide ${i + 1}`}
              onClick={() => setSlide(i)}
            />
          ))}
        </div>
      </section>

      <div className="u-wrap">
        <div className="u-quick">
          {QUICK_LINKS.map((link) => (
            <a key={link.label} href={link.href}>
              <i>{link.label.slice(0, 1)}</i>
              {link.label}
            </a>
          ))}
        </div>

        {error && <p className="toast error">{error}</p>}

        <section className="u-rail">
          <div className="u-rail-head">
            <h2>Lịch học trực tiếp</h2>
            <a href="/khoa-hoc">
              Xem tiếp <span aria-hidden>›</span>
            </a>
          </div>
          <div className="u-live-track">
            {LIVE_CLASSES.map((row) => (
              <a key={row.id} className="u-live" href="/khoa-hoc">
                <div className={`u-live-art ${row.tone}`}>{row.platform}</div>
                <h3>{row.title}</h3>
                <div className="u-live-meta">
                  <span>
                    {row.date} · {row.time}
                  </span>
                  <b>{row.priceLabel}</b>
                </div>
              </a>
            ))}
          </div>
        </section>

        <CourseRail title="Top bán chạy" href="/khoa-hoc?sort=best" products={best} campaigns={campaigns} />
        <CourseRail title="Siêu ưu đãi hôm nay" href="/khoa-hoc?sort=sale" products={sale.length ? sale : best.slice(0, 4)} campaigns={campaigns} />
        <CourseRail title="Học viên đang xem" href="/khoa-hoc" products={watching} campaigns={campaigns} />
        <CourseRail title="Học nhiều trong tuần" href="/khoa-hoc" products={weekly.length ? weekly : best} campaigns={campaigns} />
        <CourseRail title="Khóa học mới ra mắt" href="/khoa-hoc?sort=new" products={newest} campaigns={campaigns} />
        <CourseRail title="Combo siêu ưu đãi" href="/khoa-hoc?type=bundle" products={bundles} campaigns={campaigns} />
        <CourseRail title="Khóa học miễn phí" href="/khoa-hoc?sort=free" products={free} campaigns={campaigns} />
        <CourseRail title="Sách hay nên đọc" href="/khoa-hoc?type=doc" products={docs} campaigns={campaigns} />

        <section className="u-rail">
          <div className="u-rail-head">
            <h2>Giảng viên tiêu biểu</h2>
            <a href="/giang-vien">
              Xem tiếp <span aria-hidden>›</span>
            </a>
          </div>
          <div className="u-teachers">
            {FEATURED_TEACHERS.map((teacher) => (
              <a key={teacher.name} className="u-teacher" href="/giang-vien">
                <div className="u-avatar" style={coverStyle(teacher.name)}>
                  {teacher.name.slice(0, 1)}
                </div>
                <strong>{teacher.name}</strong>
                <span>{teacher.role}</span>
              </a>
            ))}
          </div>
        </section>

        <section className="u-become">
          <div>
            <h2>Trở thành Giảng viên Unica</h2>
            <p>Giúp mọi người trở nên tốt hơn — bao gồm cả chính bạn</p>
          </div>
          <a className="btn" href="/giang-vien">
            Đăng ký ngay
          </a>
        </section>
      </div>
    </>
  );
}
