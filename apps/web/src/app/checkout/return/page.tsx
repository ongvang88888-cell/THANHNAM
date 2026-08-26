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
  invoice?: { number: string } | null;
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
  const { token, ready } = useAuth();
  const [order, setOrder] = useState<OrderView | null>(null);
  const [error, setError] = useState("");
  const [tries, setTries] = useState(0);

  useEffect(() => {
    if (!ready) return;
    if (!orderId) {
      setError("Thiếu orderId");
      return;
    }
    if (!token) {
      setError("Cần đăng nhập để xem trạng thái đơn");
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      try {
        const next = await apiGet<OrderView>(`/orders/${orderId}`, token);
        if (cancelled) return;
        setOrder(next);
        const paid = next.status === "PAID" || next.status === "FULFILLED";
        if (!paid && tries < 15) {
          timer = setTimeout(() => setTries((n) => n + 1), 2000);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Không tải được đơn");
      }
    }

    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [orderId, token, ready, tries]);

  if (error) {
    return (
      <section className="u-wrap">
        <h1>Thanh toán</h1>
        <p className="error">{error}</p>
        <a href="/login">Đăng nhập</a> · <a href="/">Cửa hàng</a>
      </section>
    );
  }

  if (!order) return <p className="muted">Đang kiểm tra thanh toán…</p>;

  const paid = order.status === "PAID" || order.status === "FULFILLED";

  return (
    <section className="u-wrap">
      <h1>
        {paid ? "Thanh toán thành công" : `Đơn ${order.status}`}
      </h1>
      <p className="muted">
        {order.id} · {order.payments[0]?.provider ?? "—"} · {formatVnd(order.totalMinor)}{" "}
        {order.currency}
      </p>

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Sản phẩm</h2>
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
        <p style={{ marginTop: 20, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a className="btn" href="/library">
            Vào thư viện
          </a>
          {order.invoice?.number && (
            <a className="btn secondary" href={`/invoices/${order.invoice.number}`}>
              Xem hóa đơn
            </a>
          )}
        </p>
      ) : (
        <p className="muted">
          Nếu vừa thanh toán, webhook đang xử lý. Trang này tự làm mới trong khoảng 30 giây.
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
