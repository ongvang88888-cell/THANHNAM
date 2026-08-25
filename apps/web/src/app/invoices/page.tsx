"use client";

import { useEffect, useState } from "react";
import { apiGet, formatVnd } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";

type Invoice = {
  id: string;
  number: string;
  totalMinor: number;
  currency: string;
  issuedAt: string;
  status: string;
};

export default function InvoicesPage() {
  const { token, ready } = useRequireAuth();
  const [items, setItems] = useState<Invoice[]>([]);

  useEffect(() => {
    if (!ready || !token) return;
    apiGet<Invoice[]>("/invoices", token).then(setItems).catch(console.error);
  }, [ready, token]);

  return (
    <section>
      <h1 style={{ fontFamily: "var(--font-display)" }}>Hóa đơn</h1>
      <div className="panel">
        {items.length === 0 && <p className="muted">Chưa có hóa đơn.</p>}
        <ul className="lesson-list">
          {items.map((inv) => (
            <li key={inv.id}>
              <a href={`/invoices/${inv.number}`}>
                {inv.number} · {inv.status}
              </a>
              <span>
                {formatVnd(inv.totalMinor)} · {new Date(inv.issuedAt).toLocaleDateString("vi-VN")}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
