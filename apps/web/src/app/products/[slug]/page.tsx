"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiGet, apiPost, formatVnd } from "@/lib/api";
import { useAuth } from "@/lib/auth";

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
  const { token } = useAuth();
  const router = useRouter();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [provider, setProvider] = useState<"mock" | "stripe" | "vnpay" | "momo" | "zalopay">("mock");
  const [couponCode, setCouponCode] = useState("");
  const [affiliateCode, setAffiliateCode] = useState("");

  useEffect(() => {
    apiGet<ProductDetail>(`/products/${slug}`).then(setProduct).catch((e) => setMsg(e.message));
    if (typeof window !== "undefined") {
      const ref = new URLSearchParams(window.location.search).get("ref");
      if (ref) setAffiliateCode(ref);
    }
  }, [slug]);

  async function buy(event: FormEvent) {
    event.preventDefault();
    if (!token) {
      router.push("/login");
      return;
    }
    if (!product) return;
    setBusy(true);
    setMsg(null);
    try {
      const returnUrl = `${window.location.origin}/checkout/return`;
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
        if (secret.startsWith("test_secret_") || !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
          setMsg(
            "Stripe sandbox stub: set STRIPE_SECRET_KEY trên API + NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY để confirm thật. Đang mở trang order.",
          );
        }
        router.push(orderReturn);
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

  return (
    <section>
      <div className="badge paid">{product.type}</div>
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
          <option value="mock">Mock (local / auto-fulfill)</option>
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
          {busy ? "Processing..." : "Mua ngay"}
        </button>
        <a className="btn secondary" href="/library">
          My Library
        </a>
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
