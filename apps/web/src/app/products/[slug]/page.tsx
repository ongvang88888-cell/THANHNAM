"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiGet, apiPost, formatVnd } from "@/lib/api";
import { useAuth } from "@/lib/auth";

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
  prices: Array<{ amountMinor: number; currency: string }>;
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

type CheckoutResult = {
  order: { id: string; status: string };
  fulfilled?: boolean;
  intent?: {
    clientAction?: {
      type?: string;
      clientSecret?: string;
      url?: string;
    };
  };
};

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const { token, ready } = useAuth();
  const router = useRouter();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [provider, setProvider] = useState<"mock" | "stripe" | "vnpay" | "momo" | "zalopay">("mock");
  const [checkoutCfg, setCheckoutCfg] = useState<CheckoutConfig | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [affiliateCode, setAffiliateCode] = useState("");
  const [campaignBadge, setCampaignBadge] = useState<string | null>(null);
  const [wishMsg, setWishMsg] = useState<string | null>(null);

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
          const next = (cfg.checkout.defaultProvider || "mock") as typeof provider;
          if (next === "mock" || next === "stripe" || next === "vnpay" || next === "momo" || next === "zalopay") {
            setProvider(next);
          }
        }
        const campaigns = await apiGet<
          Array<{
            badgeText: string;
            percentOff: number | null;
            endsAt: string;
            products: Array<{ productId: string }>;
          }>
        >("/campaigns/active");
        if (cancelled) return;
        const hit = campaigns.find((c) => c.products.some((x) => x.productId === p.id));
        if (hit) {
          setCampaignBadge(
            `${hit.badgeText}${hit.percentOff ? ` · đến ${new Date(hit.endsAt).toLocaleDateString("vi-VN")}` : ""}`,
          );
        }
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

  async function buy(event: FormEvent) {
    event.preventDefault();
    if (!ready) return;
    if (!token) {
      router.push("/login");
      return;
    }
    if (!product) return;
    setBusy(true);
    setMsg(null);
    try {
      const returnUrl = `${window.location.origin}/checkout/return`;
      const visitorKey =
        typeof window !== "undefined" ? localStorage.getItem("edu_visitor_key") || undefined : undefined;
      const res = await apiPost<CheckoutResult>(
        "/checkout/sessions",
        {
          productId: product.id,
          idempotencyKey: `web-${product.id}-${Date.now()}`,
          provider,
          platform: "web",
          returnUrl: `${returnUrl}?orderId=PENDING`,
          ...(couponCode.trim() ? { couponCode: couponCode.trim() } : {}),
          ...(affiliateCode.trim() ? { affiliateCode: affiliateCode.trim() } : {}),
          ...(visitorKey ? { visitorKey } : {}),
        },
        token,
      );

      const orderReturn = `${returnUrl}?orderId=${res.order.id}`;
      const action = res.intent?.clientAction;

      if (
        (provider === "vnpay" || provider === "momo" || provider === "zalopay") &&
        action?.type === "redirect" &&
        action.url
      ) {
        window.location.href = action.url.includes("orderId=")
          ? action.url
          : `${action.url}${action.url.includes("?") ? "&" : "?"}orderId=${res.order.id}`;
        return;
      }

      if (provider === "stripe") {
        const secret = action?.clientSecret ?? "";
        router.push(
          `/checkout/pay?orderId=${encodeURIComponent(res.order.id)}&clientSecret=${encodeURIComponent(secret)}`,
        );
        return;
      }

      // mock auto-fulfills on API
      router.push(orderReturn);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setBusy(false);
    }
  }

  if (!product) return <p className="muted">{msg || "Loading..."}</p>;
  const price = product.prices[0];
  const isCourse = product.type === "VIDEO_COURSE";
  const isDoc = product.type === "DIGITAL_DOCUMENT";
  const isBundle =
    product.type === "MIXED_BUNDLE" ||
    product.type === "COURSE_BUNDLE" ||
    product.type === "DOCUMENT_BUNDLE";
  const isSubscription = product.type === "SUBSCRIPTION" || product.type === "PREMIUM_LIBRARY";

  return (
    <section>
      <div className="badge paid">{product.type}</div>
      {campaignBadge && (
        <div className="badge" style={{ marginLeft: 8, background: "var(--accent, #C4A35A)", color: "#111" }}>
          {campaignBadge}
        </div>
      )}
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2.4rem", margin: "8px 0" }}>
        {product.name}
      </h1>
      <p className="muted">{product.description}</p>
      <p className="price" style={{ fontSize: "1.4rem", fontWeight: 700 }}>
        {price ? formatVnd(price.amountMinor) : "—"}
      </p>

      {isBundle && (product.bundleChildren?.length ?? 0) > 0 && (
        <div className="panel" style={{ marginBottom: 20 }}>
          <h2 style={{ fontFamily: "var(--font-display)", marginTop: 0 }}>Bundle includes</h2>
          <ul className="lesson-list">
            {product.bundleChildren!.map((child) => (
              <li key={child.productId}>
                <div>
                  <a href={`/products/${child.slug}`}>{child.name}</a>
                  <div className="muted">{child.type}</div>
                </div>
                <span>{child.price ? formatVnd(child.price.amountMinor) : "—"}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form className="panel stack" onSubmit={buy} style={{ marginBottom: 24, maxWidth: 480 }}>
        <label htmlFor="provider">Payment provider</label>
        <select
          id="provider"
          value={provider}
          onChange={(e) => setProvider(e.target.value as typeof provider)}
          style={{ width: "100%", padding: "12px 14px", marginBottom: 12, font: "inherit" }}
        >
          {(!checkoutCfg || checkoutCfg.allowMock) && (
            <option value="mock">Mock (local / tự hoàn tất)</option>
          )}
          <option value="stripe">Stripe</option>
          <option value="vnpay">VNPay</option>
          <option value="momo">MoMo</option>
          <option value="zalopay">ZaloPay</option>
        </select>
        <label htmlFor="coupon">Coupon code</label>
        <input
          id="coupon"
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value)}
          placeholder="WELCOME10"
          style={{ width: "100%", padding: "12px 14px", marginBottom: 12, font: "inherit" }}
        />
        <label htmlFor="affiliate">Affiliate / ref</label>
        <input
          id="affiliate"
          value={affiliateCode}
          onChange={(e) => setAffiliateCode(e.target.value)}
          placeholder="TEACHERREF"
          style={{ width: "100%", padding: "12px 14px", marginBottom: 12, font: "inherit" }}
        />
        <button type="submit" disabled={busy}>
          {busy ? "Đang xử lý..." : isSubscription ? "Đăng ký gói" : "Mua ngay"}
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => {
            if (!ready) return;
            if (!token) {
              router.push("/login");
              return;
            }
            if (!product) return;
            apiPost("/wishlist", { productId: product.id }, token)
              .then(() => setWishMsg("Đã thêm vào yêu thích"))
              .catch((e: Error) => setWishMsg(e.message));
          }}
        >
          Thêm yêu thích
        </button>
        <a className="btn secondary" href="/library">
          Thư viện
        </a>
        {wishMsg && <p className="ok">{wishMsg}</p>}
      </form>

      {isCourse && product.course && (
        <p>
          Đã mua?{" "}
          <a href={`/learn/${product.course.sections[0]?.lessons[0]?.id ?? ""}`}>
            Mở bài đầu tiên
          </a>
        </p>
      )}
      {isDoc && product.document && (
        <p>
          Đã mua? <a href={`/documents/${product.document.id}`}>Mở / tải tài liệu</a>
        </p>
      )}

      {msg && <p className="ok">{msg}</p>}

      {product.course && (
        <div className="panel">
          <h2 style={{ fontFamily: "var(--font-display)", marginTop: 0 }}>Curriculum</h2>
          {product.course.sections.map((s) => (
            <div key={s.id}>
              <h3>{s.title}</h3>
              <ul className="lesson-list">
                {s.lessons.map((l) => (
                  <li key={l.id}>
                    <div>
                      <a href={`/learn/${l.id}`}>{l.title}</a>
                      <div>
                        {l.isPreview ? (
                          <span className="badge free">FREE PREVIEW</span>
                        ) : (
                          <>
                            <span className="badge paid">BUY</span>
                            <span className="badge ad">WATCH AD</span>
                          </>
                        )}
                        {l.contents?.some((c) => c.contentType === "VIDEO") && (
                          <span className="badge">VIDEO</span>
                        )}
                      </div>
                    </div>
                    <span className="muted">{Math.round((l.durationSec || 0) / 60)} phút</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <CourseQuizzes courseId={product.course.id} token={token} />
        </div>
      )}

      <ProductReviews productId={product.id} token={token} />
    </section>
  );
}

function ProductReviews({ productId, token }: { productId: string; token: string | null }) {
  const [items, setItems] = useState<
    Array<{ id: string; rating: number; body: string; user: { displayName: string | null } }>
  >([]);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  function load() {
    apiGet<Array<{ id: string; rating: number; body: string; user: { displayName: string | null } }>>(
      `/products/${productId}/reviews`,
    )
      .then(setItems)
      .catch(() => setItems([]));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  return (
    <div className="panel" style={{ marginTop: 24 }}>
      <h2 style={{ fontFamily: "var(--font-display)", marginTop: 0 }}>Đánh giá</h2>
      {items.length === 0 && <p className="muted">Chưa có đánh giá.</p>}
      <ul className="lesson-list">
        {items.map((r) => (
          <li key={r.id}>
            <div>
              <strong>{r.user.displayName || "Học viên"}</strong> · {r.rating}/5
              <div className="muted">{r.body}</div>
            </div>
          </li>
        ))}
      </ul>
      {token && (
        <div className="stack" style={{ marginTop: 12 }}>
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
                  load();
                })
                .catch((e: Error) => setMsg(e.message));
            }}
          >
            Gửi đánh giá
          </button>
          {msg && <p className="muted">{msg}</p>}
        </div>
      )}
    </div>
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
      <h3>Quizzes</h3>
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
