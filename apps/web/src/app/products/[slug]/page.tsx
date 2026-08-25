"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiGet, apiPost, formatVnd } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type ProductDetail = {
  id: string;
  name: string;
  description: string;
  type: string;
  prices: Array<{ amountMinor: number; currency: string }>;
  course?: {
    id: string;
    sections: Array<{
      id: string;
      title: string;
      lessons: Array<{ id: string; title: string; isPreview: boolean; durationSec: number }>;
    }>;
  };
};

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const { token } = useAuth();
  const router = useRouter();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiGet<ProductDetail>(`/products/${slug}`).then(setProduct).catch((e) => setMsg(e.message));
  }, [slug]);

  async function buy() {
    if (!token) {
      router.push("/login");
      return;
    }
    if (!product) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await apiPost<{ order: { status: string }; fulfilled?: boolean }>(
        "/checkout/sessions",
        {
          productId: product.id,
          idempotencyKey: `web-${product.id}-${Date.now()}`,
          provider: "mock",
        },
        token,
      );
      setMsg(`Thanh toán ${res.order.status}${res.fulfilled ? " — đã cấp quyền" : ""}`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setBusy(false);
    }
  }

  if (!product) return <p className="muted">{msg || "Loading..."}</p>;
  const price = product.prices[0];

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
      <div style={{ display: "flex", gap: 12, margin: "18px 0 28px" }}>
        <button onClick={buy} disabled={busy}>
          {busy ? "Processing..." : "Mua ngay"}
        </button>
        <a className="btn secondary" href="/library">
          My Library
        </a>
      </div>
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
                      </div>
                    </div>
                    <span className="muted">{Math.round(l.durationSec / 60)} phút</span>
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
