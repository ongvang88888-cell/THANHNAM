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
  creatorUserId?: string | null;
  updatedAt?: string;
};

export default function AdminPage() {
  const { token, user } = useAuth();
  const router = useRouter();
  const [dash, setDash] = useState<Dash | null>(null);
  const [queue, setQueue] = useState<ReviewItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    if (!token) return;
    const [d, q] = await Promise.all([
      apiGet<Dash>("/admin/dashboard", token),
      apiGet<ReviewItem[]>("/admin/review-queue", token),
    ]);
    setDash(d);
    setQueue(q);
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

  return (
    <section>
      <h1 style={{ fontFamily: "var(--font-display)" }}>Admin</h1>
      <p className="muted">admin@edu.local · dashboard + review queue</p>
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
    </section>
  );
}
