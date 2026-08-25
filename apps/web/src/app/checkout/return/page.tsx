"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiGet, formatVnd } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type OrderView = {
  id: string;
  status: string;
  totalMinor: number;
  currency: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitAmountMinor: number;
    product?: { name: string; type: string; slug: string };
  }>;
  payments: Array<{ status: string; provider: string; providerRef: string | null }>;
};

function ReturnInner() {
  const search = useSearchParams();
  const orderId = search.get("orderId");
  const { token } = useAuth();
  const [order, setOrder] = useState<OrderView | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orderId) {
      setError("Missing orderId");
      return;
    }
    if (!token) {
      setError("Login required to view order status");
      return;
    }
    void apiGet<OrderView>(`/orders/${orderId}`, token)
      .then(setOrder)
      .catch((err: Error) => setError(err.message));
  }, [orderId, token]);

  if (error) {
    return (
      <section>
        <h1 style={{ fontFamily: "var(--font-display)" }}>Checkout</h1>
        <p className="error">{error}</p>
        <a href="/login">Login</a> · <a href="/">Catalog</a>
      </section>
    );
  }

  if (!order) return <p className="muted">Checking payment…</p>;

  const paid = order.status === "PAID" || order.status === "FULFILLED";

  return (
    <section>
      <h1 style={{ fontFamily: "var(--font-display)" }}>
        {paid ? "Thanh toán thành công" : `Order ${order.status}`}
      </h1>
      <p className="muted">
        Order {order.id} · {order.payments[0]?.provider ?? "—"} · {formatVnd(order.totalMinor)}{" "}
        {order.currency}
      </p>

      <div className="panel">
        <h2 style={{ fontFamily: "var(--font-display)", marginTop: 0 }}>Items</h2>
        <ul className="lesson-list">
          {order.items.map((item) => (
            <li key={item.productId}>
              <div>
                {item.product ? (
                  <a href={`/products/${item.product.slug}`}>{item.product.name}</a>
                ) : (
                  item.productId
                )}
                <div className="muted">{item.product?.type}</div>
              </div>
              <span>{formatVnd(item.unitAmountMinor)}</span>
            </li>
          ))}
        </ul>
      </div>

      {paid ? (
        <p style={{ marginTop: 20 }}>
          <a className="btn" href="/library">
            Vào My Library
          </a>
        </p>
      ) : (
        <p className="muted">
          Nếu vừa thanh toán Stripe/VNPay, đợi webhook rồi refresh trang này.
        </p>
      )}
    </section>
  );
}

export default function CheckoutReturnPage() {
  return (
    <Suspense fallback={<p className="muted">Loading…</p>}>
      <ReturnInner />
    </Suspense>
  );
}
