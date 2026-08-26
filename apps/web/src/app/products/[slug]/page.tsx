"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PriceTag } from "@/components/PriceTag";
import { Stars } from "@/components/Stars";
import { apiGet, apiPost } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import {
  coverStyle,
  discountPercent,
  instructorLabel,
  splitDescription,
  type CatalogCampaign,
  type CatalogProduct,
} from "@/lib/catalog";
import { followCheckout, startCheckout, type CheckoutProvider } from "@/lib/checkout";
import { productTypeLabel } from "@/lib/labels";

type CheckoutConfig = {
  allowMock: boolean;
  defaultProvider: string;
  vnProviders: string[];
  production: boolean;
};

type BundleChild = {
  productId: string;
  position: number;
  type: string;
  name: string;
  slug: string;
  description: string | null;
  price: { currency: string; amountMinor: number } | null;
};

type ProductDetail = {
  id: string;
  name: string;
  description: string;
  type: string;
  slug: string;
  thumbnailUrl?: string | null;
  category?: { name?: string; slug?: string } | string | null;
  prices: Array<{ amountMinor: number; currency: string; compareAtMinor?: number | null }>;
  course?: {
    id: string;
    sections: Array<{
      id: string;
      title: string;
      lessons: Array<{
        id: string;
        title: string;
        isPreview: boolean;
        durationSec: number;
        contents?: Array<{ contentType: string; refId?: string | null }>;
      }>;
    }>;
  } | null;
  document?: { id: string; versions?: Array<{ id: string; version: number }> } | null;
  bundleChildren?: BundleChild[];
};

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const { token, ready } = useAuth();
  const { add, has } = useCart();
  const router = useRouter();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [provider, setProvider] = useState<CheckoutProvider>("mock");
  const [checkoutCfg, setCheckoutCfg] = useState<CheckoutConfig | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [affiliateCode, setAffiliateCode] = useState("");
  const [campaign, setCampaign] = useState<CatalogCampaign | null>(null);
  const [wishMsg, setWishMsg] = useState<string | null>(null);
  const [reviews, setReviews] = useState<
    Array<{ id: string; rating: number; body: string; user: { displayName: string | null } }>
  >([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await apiGet<ProductDetail>(`/products/${slug}`);
        if (cancelled) return;
        setProduct(p);
        const cfg = await apiGet<{ checkout: CheckoutConfig }>("/remote-config");
        if (!cancelled) {
          setCheckoutCfg(cfg.checkout);
          const next = (cfg.checkout.defaultProvider || "mock") as CheckoutProvider;
          if (next === "mock" || next === "stripe" || next === "vnpay" || next === "momo" || next === "zalopay") {
            setProvider(next);
          }
        }
        const campaigns = await apiGet<CatalogCampaign[]>("/campaigns/active").catch(() => []);
        if (cancelled) return;
        setCampaign(campaigns.find((c) => c.products.some((x) => x.productId === p.id)) ?? null);
        const revs = await apiGet<
          Array<{ id: string; rating: number; body: string; user: { displayName: string | null } }>
        >(`/products/${p.id}/reviews`).catch(() => []);
        if (!cancelled) setReviews(revs);
      } catch (e) {
        if (!cancelled) setMsg(e instanceof Error ? e.message : "Load failed");
      }
    })();

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      let visitorKey = localStorage.getItem("edu_visitor_key");
      if (!visitorKey) {
        visitorKey = `vk_${Math.random().toString(36).slice(2)}_${Date.now()}`;
        localStorage.setItem("edu_visitor_key", visitorKey);
      }
      if (ref) {
        setAffiliateCode(ref);
        apiPost("/affiliate/track", { code: ref, visitorKey }).catch(() => undefined);
      }
    }
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const catalogProduct: CatalogProduct | null = useMemo(() => {
    if (!product) return null;
    const price = product.prices[0];
    return {
      id: product.id,
      type: product.type,
      name: product.name,
      slug: product.slug,
      description: product.description,
      thumbnailUrl: product.thumbnailUrl,
      category: typeof product.category === "string" ? product.category : product.category?.slug ?? null,
      price: price
        ? {
            currency: price.currency,
            amountMinor: price.amountMinor,
            compareAtMinor: price.compareAtMinor ?? null,
          }
        : null,
    };
  }, [product]);

  const avgRating = reviews.length
    ? reviews.reduce((sum, row) => sum + row.rating, 0) / reviews.length
    : null;
  const lessons = product?.course?.sections.flatMap((s) => s.lessons) ?? [];
  const minutes = Math.round(lessons.reduce((sum, l) => sum + (l.durationSec || 0), 0) / 60);
  const learnItems = splitDescription(product?.description ?? "");
  const categoryName =
    typeof product?.category === "string" ? product.category : product?.category?.name ?? "Khóa học";

  async function buy(event?: FormEvent) {
    event?.preventDefault();
    if (!ready) return;
    if (!token) {
      router.push(`/login?next=${encodeURIComponent(`/products/${slug}`)}`);
      return;
    }
    if (!product) return;
    setBusy(true);
    setMsg(null);
    try {
      const outcome = await startCheckout({
        productId: product.id,
        token,
        provider,
        couponCode,
        affiliateCode,
      });
      followCheckout(outcome, (href) => router.push(href));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setBusy(false);
    }
  }

  function addCart() {
    if (!catalogProduct) return;
    add(catalogProduct);
    setWishMsg("Đã thêm vào giỏ hàng");
  }

  if (!product) return <p className="u-wrap muted" style={{ padding: 40 }}>{msg || "Đang mở khóa học…"}</p>;
  const price = product.prices[0];
  const off = discountPercent(price?.amountMinor ?? 0, price?.compareAtMinor ?? null);
  const firstLesson = product.course?.sections[0]?.lessons[0]?.id;

  return (
    <>
      <section className="u-course-hero">
        <div className="u-wrap">
          <div className="u-crumb">
            <a href="/">Unica</a>
            <span>/</span>
            <a href="/khoa-hoc">{categoryName}</a>
            <span>/</span>
            <span>{product.name}</span>
          </div>
          <h1>{product.name}</h1>
          <p className="lead">{product.description}</p>
          <div className="u-social-proof">
            <Stars value={avgRating} count={reviews.length} />
            <span>{lessons.length} bài học</span>
            <span>{catalogProduct ? instructorLabel(catalogProduct) : "Giảng viên Unica"}</span>
          </div>
        </div>
      </section>

      <div className="u-wrap u-course-layout">
        <div>
          {learnItems.length > 0 && (
            <section className="u-learn-box">
              <h2>Bạn sẽ học được gì?</h2>
              <ul className="u-learn-grid">
                {learnItems.map((item) => (
                  <li key={item}>
                    <span className="u-check">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="u-intro">
            <h2>Giới thiệu khóa học</h2>
            <p>{product.description}</p>
            {product.bundleChildren && product.bundleChildren.length > 0 && (
              <>
                <h3>Combo gồm</h3>
                <ul className="lesson-list">
                  {product.bundleChildren.map((child) => (
                    <li key={child.productId}>
                      <a href={`/products/${child.slug}`}>{child.name}</a>
                      <span>{productTypeLabel(child.type)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          {product.course && (
            <section className="u-curr">
              <h2>Nội dung khóa học</h2>
              <p className="muted">
                {product.course.sections.length} chương · {lessons.length} bài
                {minutes ? ` · ${minutes} phút` : ""}
              </p>
              {product.course.sections.map((section) => (
                <details key={section.id} open>
                  <summary>
                    {section.title} · {section.lessons.length} bài
                  </summary>
                  <ul>
                    {section.lessons.map((lesson) => (
                      <li key={lesson.id}>
                        <a href={`/learn/${lesson.id}`}>
                          {lesson.title}
                          {lesson.isPreview ? " · Học thử" : ""}
                        </a>
                        <span className="muted">{Math.round((lesson.durationSec || 0) / 60)} phút</span>
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
              <CourseQuizzes courseId={product.course.id} token={token} />
            </section>
          )}

          <ProductReviews
            productId={product.id}
            token={token}
            items={reviews}
            onChange={setReviews}
          />
        </div>

        <aside className="u-buy">
          <div className="u-buy-cover" style={product.thumbnailUrl ? undefined : coverStyle(product.slug)}>
            {product.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.thumbnailUrl} alt="" />
            ) : (
              "▶"
            )}
          </div>
          <form className="u-buy-body" onSubmit={buy}>
            <PriceTag
              amountMinor={price?.amountMinor}
              compareAtMinor={price?.compareAtMinor}
              size="box"
            />
            {campaign && (
              <div className="u-deal">
                {campaign.badgeText}
                {off ? ` · -${off}%` : ""}
                {campaign.endsAt ? ` · đến ${new Date(campaign.endsAt).toLocaleDateString("vi-VN")}` : ""}
              </div>
            )}
            <div className="u-buy-actions">
              <button type="submit" disabled={busy}>
                {busy ? "Đang xử lý…" : "Mua ngay"}
              </button>
              <button type="button" className="btn-green" onClick={addCart}>
                {has(product.id) ? "Đã có trong giỏ" : "Thêm vào giỏ hàng"}
              </button>
              <a className="btn ghost" href="/hoi-vien">
                Gói hội viên Unica
              </a>
            </div>
            <label htmlFor="provider">Cổng thanh toán</label>
            <select
              id="provider"
              value={provider}
              onChange={(e) => setProvider(e.target.value as CheckoutProvider)}
            >
              {(!checkoutCfg || checkoutCfg.allowMock) && (
                <option value="mock">Thử nghiệm (tự hoàn tất)</option>
              )}
              <option value="vnpay">VNPay</option>
              <option value="momo">MoMo</option>
              <option value="zalopay">ZaloPay</option>
              <option value="stripe">Stripe</option>
            </select>
            <label htmlFor="coupon">Mã giảm giá</label>
            <input
              id="coupon"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder="WELCOME10"
            />
            <label htmlFor="affiliate">Mã giới thiệu</label>
            <input
              id="affiliate"
              value={affiliateCode}
              onChange={(e) => setAffiliateCode(e.target.value)}
              placeholder="TEACHERREF"
            />
            <ul className="u-trust">
              <li>Đảm bảo hoàn tiền trong 07 ngày</li>
              <li>Sở hữu khóa học trọn đời</li>
              <li>{lessons.length || "Nhiều"} bài giảng · học trên web & app</li>
              <li>Hỗ trợ chứng chỉ hoàn thành</li>
            </ul>
            <div className="studio-actions" style={{ marginTop: 12 }}>
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  if (!ready) return;
                  if (!token) {
                    router.push(`/login?next=${encodeURIComponent(`/products/${slug}`)}`);
                    return;
                  }
                  apiPost("/wishlist", { productId: product.id }, token)
                    .then(() => setWishMsg("Đã thêm vào yêu thích"))
                    .catch((e: Error) => setWishMsg(e.message));
                }}
              >
                ♡ Yêu thích
              </button>
              {firstLesson && (
                <a className="btn ghost" href={`/learn/${firstLesson}`}>
                  Học thử
                </a>
              )}
              {product.document && (
                <a className="btn ghost" href={`/documents/${product.document.id}`}>
                  Mở tài liệu
                </a>
              )}
            </div>
            {wishMsg && <p className="ok">{wishMsg}</p>}
            {msg && <p className="error">{msg}</p>}
          </form>
        </aside>
      </div>
    </>
  );
}

function ProductReviews({
  productId,
  token,
  items,
  onChange,
}: {
  productId: string;
  token: string | null;
  items: Array<{ id: string; rating: number; body: string; user: { displayName: string | null } }>;
  onChange: (rows: Array<{ id: string; rating: number; body: string; user: { displayName: string | null } }>) => void;
}) {
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <section className="u-reviews">
      <h2>Đánh giá khóa học</h2>
      {items.length === 0 && <p className="muted">Chưa có đánh giá.</p>}
      <ul className="lesson-list">
        {items.map((row) => (
          <li key={row.id}>
            <div>
              <strong>{row.user.displayName || "Học viên"}</strong> · {row.rating}/5
              <div className="muted">{row.body}</div>
            </div>
          </li>
        ))}
      </ul>
      {token && (
        <div className="stack">
          <label>Điểm (1–5)</label>
          <input
            type="number"
            min={1}
            max={5}
            value={rating}
            onChange={(e) => setRating(Number(e.target.value) || 5)}
          />
          <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Nhận xét (tuỳ chọn)" />
          <button
            type="button"
            className="secondary"
            onClick={() => {
              apiPost(`/products/${productId}/reviews`, { rating, body }, token)
                .then(() => {
                  setMsg("Đã lưu đánh giá");
                  setBody("");
                  return apiGet<typeof items>(`/products/${productId}/reviews`);
                })
                .then(onChange)
                .catch((e: Error) => setMsg(e.message));
            }}
          >
            Gửi đánh giá
          </button>
          {msg && <p className="muted">{msg}</p>}
        </div>
      )}
    </section>
  );
}

function CourseQuizzes({ courseId, token }: { courseId: string; token: string | null }) {
  const [quizzes, setQuizzes] = useState<Array<{ id: string; title: string }>>([]);
  useEffect(() => {
    apiGet<Array<{ id: string; title: string }>>(`/quizzes/by-course/${courseId}`, token)
      .then(setQuizzes)
      .catch(() => setQuizzes([]));
  }, [courseId, token]);
  if (quizzes.length === 0) return null;
  return (
    <div style={{ marginTop: 20 }}>
      <h3>Quiz</h3>
      <ul className="lesson-list">
        {quizzes.map((q) => (
          <li key={q.id}>
            <a href={`/quizzes/${q.id}`}>{q.title}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
