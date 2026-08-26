"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost, formatVnd } from "@/lib/api";
import { AdminDenied } from "@/components/AdminDenied";
import { hasRole, useRequireAuth } from "@/lib/auth";
import { productTypeLabel, statusLabel, statusTone } from "@/lib/labels";

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
    setMsg("Đã xuất bản sản phẩm");
    await load();
  }

  async function refund(orderId: string) {
    if (!token) return;
    if (!confirm(`Refund order ${orderId} and revoke entitlements?`)) return;
    await apiPost(`/orders/${orderId}/refund`, { reason: "admin_ui_refund" }, token);
    setMsg("Đã hoàn đơn");
    await load();
  }

  if (ready && user && !hasRole(user, ["admin", "support_agent"])) {
    return <AdminDenied nextPath="/admin" />;
  }

  return (
    <section className="u-wrap">
      <div className="page-head">
        <h1>Quản trị</h1>
        <p className="muted">Duyệt khóa, theo dõi đơn, cấp quyền và hoa hồng.</p>
      </div>
      <nav className="admin-nav">
        <a className="is-on" href="/admin">Tổng quan</a>
        <a href="/admin/courses">Quản lý khóa học</a>
        <a href="/admin/courses/import">Nhập hàng loạt</a>
      </nav>
      {error && <p className="toast error">{error}</p>}
      {msg && <p className="toast ok">{msg}</p>}

      {dash && (
        <div className="stats-grid">
          <div className="stat">
            <div className="label">Người dùng</div>
            <p className="value">{dash.users}</p>
          </div>
          <div className="stat">
            <div className="label">Sản phẩm</div>
            <p className="value">{dash.products}</p>
          </div>
          <div className="stat">
            <div className="label">Đơn đã trả</div>
            <p className="value">{dash.paidOrders}</p>
          </div>
          <div className="stat">
            <div className="label">Quyền đang mở</div>
            <p className="value">{dash.activeEntitlements}</p>
          </div>
          <div className="stat">
            <div className="label">Doanh thu</div>
            <p className="value">{formatVnd(dash.revenueMinor)}</p>
          </div>
        </div>
      )}

      <div className="panel" style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: "var(--font-display)", color: "var(--brand)" }}>Khóa học</h2>
        <p className="muted">Thêm, sửa, ẩn, lưu trữ hoặc xóa khóa học của toàn trường.</p>
        <div className="admin-actions">
          <a className="btn" href="/admin/courses">Mở quản lý khóa học</a>
          <a className="btn secondary" href="/admin/courses/import">Nhập hàng loạt</a>
        </div>
      </div>

      <h2 style={{ fontFamily: "var(--font-display)", color: "var(--brand)" }}>Hàng chờ duyệt</h2>
      <div className="panel">
        {queue.length === 0 && <p className="muted">Không có sản phẩm chờ duyệt.</p>}
        <ul className="lesson-list">
          {queue.map((p) => (
            <li key={p.id}>
              <div>
                <strong>{p.name}</strong>
                <div className="muted">
                  {productTypeLabel(p.type)} · {p.slug}
                </div>
              </div>
              <button type="button" onClick={() => publish(p.id).catch((e) => setError(e.message))}>
                Xuất bản
              </button>
            </li>
          ))}
        </ul>
      </div>

      <h2 style={{ fontFamily: "var(--font-display)", color: "var(--brand)" }}>Người dùng</h2>
      <div className="panel">
        <ul className="lesson-list">
          {users.map((u) => (
            <li key={u.id}>
              <span>
                {u.displayName} · {u.email}
              </span>
              <span className={`badge ${statusTone(u.status)}`}>{statusLabel(u.status)}</span>
            </li>
          ))}
        </ul>
        <label>Cấp quyền — mã người dùng</label>
        <input value={grantUserId} onChange={(e) => setGrantUserId(e.target.value)} />
        <label>Mã sản phẩm</label>
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
              .then(() => setMsg("Đã cấp quyền"))
              .catch((e: Error) => setError(e.message));
          }}
        >
          Cấp sản phẩm
        </button>
      </div>

      <h2 style={{ fontFamily: "var(--font-display)", color: "var(--brand)" }}>Mã giảm giá</h2>
      <div className="panel">
        <ul className="lesson-list">
          {coupons.map((c) => (
            <li key={c.code}>
              <span>{c.code}</span>
              <span>{c.percentOff ? `${c.percentOff}%` : ""} {c.enabled ? "Bật" : "Tắt"}</span>
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
                setMsg("Đã lưu mã giảm giá");
                void load();
              })
              .catch((e: Error) => setError(e.message));
          }}
        >
          Tạo/cập nhật coupon 20%
        </button>
      </div>

      <h2 style={{ fontFamily: "var(--font-display)", color: "var(--brand)" }}>Rút hoa hồng</h2>
      <div className="panel">
        {payouts.length === 0 && <p className="muted">Chưa có yêu cầu rút.</p>}
        <ul className="lesson-list">
          {payouts.map((p) => (
            <li key={p.id}>
              <span>
                {statusLabel(p.status)} · {formatVnd(p.amountMinor)}
              </span>
              {p.status === "REQUESTED" && (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    if (!token) return;
                    apiPost(`/admin/affiliate-payouts/${p.id}/resolve`, { status: "PAID" }, token)
                      .then(() => {
                        setMsg("Đã đánh dấu đã trả");
                        void load();
                      })
                      .catch((e: Error) => setError(e.message));
                  }}
                >
                  Đánh dấu đã trả
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      <h2 style={{ fontFamily: "var(--font-display)", color: "var(--brand)" }}>Đơn hàng / hoàn tiền</h2>
      <div className="panel">
        <ul className="lesson-list">
          {orders.slice(0, 30).map((o) => (
            <li key={o.id}>
              <div>
                <strong>{statusLabel(o.status)}</strong> · {formatVnd(o.totalMinor)} {o.currency}
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
                  Hoàn tiền
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
