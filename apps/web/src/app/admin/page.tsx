"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost, formatVnd } from "@/lib/api";
import { hasRole, useRequireAuth } from "@/lib/auth";

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
  const { token, user, ready } = useRequireAuth();
  const [dash, setDash] = useState<Dash | null>(null);
  const [queue, setQueue] = useState<ReviewItem[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [users, setUsers] = useState<Array<{ id: string; email: string; displayName: string; status: string }>>([]);
  const [coupons, setCoupons] = useState<Array<{ code: string; percentOff: number | null; enabled: boolean }>>([]);
  const [payouts, setPayouts] = useState<Array<{ id: string; amountMinor: number; status: string }>>([]);
  const [grantUserId, setGrantUserId] = useState("");
  const [grantResource, setGrantResource] = useState("");
  const [couponCode, setCouponCode] = useState("SAVE20");

  async function load() {
    if (!token) return;
    const [d, q, o, u, c, p] = await Promise.all([
      apiGet<Dash>("/admin/dashboard", token),
      apiGet<ReviewItem[]>("/admin/review-queue", token),
      apiGet<OrderRow[]>("/admin/orders", token),
      apiGet<Array<{ id: string; email: string; displayName: string; status: string }>>("/admin/users", token).catch(() => []),
      apiGet<Array<{ code: string; percentOff: number | null; enabled: boolean }>>("/admin/coupons", token).catch(() => []),
      apiGet<Array<{ id: string; amountMinor: number; status: string }>>("/admin/affiliate-payouts", token).catch(() => []),
    ]);
    setDash(d);
    setQueue(q);
    setOrders(o);
    setUsers(u);
    setCoupons(c);
    setPayouts(p);
    if (!grantUserId && u[0]) setGrantUserId(u[0].id);
  }

  useEffect(() => {
    if (!ready || !token) return;
    load().catch((e) => setError(e.message));
  }, [ready, token]);

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

  if (ready && user && !hasRole(user, ["admin", "support_agent"])) {
    return <p className="error">Tài khoản này không có quyền quản trị.</p>;
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

      <h2 style={{ fontFamily: "var(--font-display)" }}>Users</h2>
      <div className="panel">
        <ul className="lesson-list">
          {users.map((u) => (
            <li key={u.id}>
              <span>
                {u.displayName} · {u.email}
              </span>
              <span className="badge">{u.status}</span>
            </li>
          ))}
        </ul>
        <label>Grant entitlement (userId)</label>
        <input value={grantUserId} onChange={(e) => setGrantUserId(e.target.value)} />
        <label>resourceId (product id)</label>
        <input value={grantResource} onChange={(e) => setGrantResource(e.target.value)} />
        <button
          type="button"
          className="secondary"
          onClick={() => {
            if (!token) return;
            apiPost(
              "/admin/entitlements/grant",
              {
                userId: grantUserId,
                resourceType: "product",
                resourceId: grantResource,
                reason: "admin_ui_grant",
              },
              token,
            )
              .then(() => setMsg("Granted"))
              .catch((e: Error) => setError(e.message));
          }}
        >
          Grant product
        </button>
      </div>

      <h2 style={{ fontFamily: "var(--font-display)" }}>Coupons</h2>
      <div className="panel">
        <ul className="lesson-list">
          {coupons.map((c) => (
            <li key={c.code}>
              <span>{c.code}</span>
              <span>{c.percentOff ? `${c.percentOff}%` : ""} {c.enabled ? "ON" : "OFF"}</span>
            </li>
          ))}
        </ul>
        <input value={couponCode} onChange={(e) => setCouponCode(e.target.value)} />
        <button
          type="button"
          className="secondary"
          onClick={() => {
            if (!token) return;
            apiPost("/admin/coupons", { code: couponCode, percentOff: 20 }, token)
              .then(() => {
                setMsg("Coupon saved");
                void load();
              })
              .catch((e: Error) => setError(e.message));
          }}
        >
          Tạo/cập nhật coupon 20%
        </button>
      </div>

      <h2 style={{ fontFamily: "var(--font-display)" }}>Affiliate payouts</h2>
      <div className="panel">
        {payouts.length === 0 && <p className="muted">Chưa có yêu cầu rút.</p>}
        <ul className="lesson-list">
          {payouts.map((p) => (
            <li key={p.id}>
              <span>
                {p.status} · {formatVnd(p.amountMinor)}
              </span>
              {p.status === "REQUESTED" && (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    if (!token) return;
                    apiPost(`/admin/affiliate-payouts/${p.id}/resolve`, { status: "PAID" }, token)
                      .then(() => {
                        setMsg("Payout marked PAID");
                        void load();
                      })
                      .catch((e: Error) => setError(e.message));
                  }}
                >
                  Mark PAID
                </button>
              )}
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
