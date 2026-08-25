"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPatch } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";

type Notif = {
  id: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

export default function NotificationsPage() {
  const { token, ready } = useRequireAuth();
  const [items, setItems] = useState<Notif[]>([]);

  useEffect(() => {
    if (!ready || !token) return;
    apiGet<Notif[]>("/notifications", token).then(setItems).catch(console.error);
  }, [ready, token]);

  async function markAll() {
    if (!token) return;
    await apiPatch("/notifications/read-all", {}, token);
    setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
  }

  return (
    <section>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <h1 style={{ fontFamily: "var(--font-display)" }}>Notifications</h1>
        <button className="secondary" onClick={markAll}>
          Mark all read
        </button>
      </div>
      <div className="panel">
        {items.length === 0 && <p className="muted">Chưa có thông báo.</p>}
        <ul className="lesson-list">
          {items.map((n) => (
            <li key={n.id}>
              <div>
                <strong>{n.title}</strong>
                {!n.readAt && <span className="badge ad">NEW</span>}
                <div className="muted">{n.body}</div>
              </div>
              <span className="muted">{new Date(n.createdAt).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
