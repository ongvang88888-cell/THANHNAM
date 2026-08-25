"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, formatVnd } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Dash = {
  users: number;
  products: number;
  paidOrders: number;
  activeEntitlements: number;
  revenueMinor: number;
};

type ReviewItem = {
  id: string;
  name: string;
  type: string;
  status: string;
  slug: string;
};

type OrderRow = {
  id: string;
  status: string;
  totalMinor: number;
  currency: string;
  user?: { email: string };
  payments: Array<{ provider: string; status: string }>;
};

export default function AdminPage() {
  const { token, user } = useAuth();
  const router = useRouter();
  const [dash, setDash] = useState<Dash | null>(null);
  const [queue, setQueue] = useState<ReviewItem[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    if (!token) return;
    const [d, q, o] = await Promise.all([
      apiGet<Dash>("/admin/dashboard", token),
      apiGet<ReviewItem[]>("/admin/review-queue", token),
      apiGet<OrderRow[]>("/admin/orders", token),
    ]);
    setDash(d);
    setQueue(q);
    setOrders(o);
  }

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    load().catch((e) => setError(e.message));
  }, [token, router]);

  async function publish(id: string) {
    if (!token) return;
    await apiPost(`/admin/products/${id}/publish`, {}, token);
    setMsg(`Published ${id}`);
    await load();
  }

  async function refund(orderId: string) {
    if (!token) return;
    if (!confirm(`Refund order ${orderId} and revoke entitlements?`)) return;
    await apiPost(`/orders/${orderId}/refund`, { reason: "admin_ui_refund" }, token);
    setMsg(`Refunded ${orderId}`);
    await load();
  }

  return (
    <section>
      <h1 style={{ fontFamily: "var(--font-display)" }}>Admin</h1>
      <p className="muted">admin@edu.local · dashboard + review + refunds</p>
      {user && <p>{user.email}</p>}
      {error && <p className="error">{error}</p>}
      {msg && <p className="ok">{msg}</p>}

      {dash && (
        <div className="grid">
          <div className="panel">
            <h3>Users</h3>
            <p style={{ fontSize: "2rem" }}>{dash.users}</p>
          </div>
          <div className="panel">
            <h3>Products</h3>
            <p style={{ fontSize: "2rem" }}>{dash.products}</p>
          </div>
          <div className="panel">
            <h3>Paid orders</h3>
            <p style={{ fontSize: "2rem" }}>{dash.paidOrders}</p>
          </div>
          <div className="panel">
            <h3>Entitlements</h3>
            <p style={{ fontSize: "2rem" }}>{dash.activeEntitlements}</p>
          </div>
          <div className="panel">
            <h3>Revenue</h3>
            <p style={{ fontSize: "1.4rem" }}>{formatVnd(dash.revenueMinor)}</p>
          </div>
        </div>
      )}

      <h2 style={{ fontFamily: "var(--font-display)" }}>Review queue (IN_REVIEW)</h2>
      <div className="panel">
        {queue.length === 0 && <p className="muted">Không có sản phẩm chờ duyệt.</p>}
        <ul className="lesson-list">
          {queue.map((p) => (
            <li key={p.id}>
              <div>
                <strong>{p.name}</strong>
                <div className="muted">
                  {p.type} · {p.slug} · {p.id}
                </div>
              </div>
              <button type="button" onClick={() => publish(p.id).catch((e) => setError(e.message))}>
                Publish
              </button>
            </li>
          ))}
        </ul>
      </div>

      <h2 style={{ fontFamily: "var(--font-display)" }}>Orders / refunds</h2>
      <div className="panel">
        <ul className="lesson-list">
          {orders.slice(0, 30).map((o) => (
            <li key={o.id}>
              <div>
                <strong>{o.status}</strong> · {formatVnd(o.totalMinor)} {o.currency}
                <div className="muted">
                  {o.id} · {o.user?.email} · {o.payments[0]?.provider}
                </div>
              </div>
              {(o.status === "FULFILLED" || o.status === "PAID") && (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => refund(o.id).catch((e) => setError(e.message))}
                >
                  Refund
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
