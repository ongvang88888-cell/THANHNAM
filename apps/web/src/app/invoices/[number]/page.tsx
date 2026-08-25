"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiGet, formatVnd } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Invoice = {
  number: string;
  buyerName: string;
  buyerEmail: string;
  currency: string;
  subtotalMinor: number;
  vatBps: number;
  vatMinor: number;
  totalMinor: number;
  issuedAt: string;
  status: string;
  order: {
    id: string;
    items: Array<{ unitAmountMinor: number; product?: { name: string } }>;
  };
};

export default function InvoiceDetailPage() {
  const { number } = useParams<{ number: string }>();
  const { token } = useAuth();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    apiGet<Invoice>(`/invoices/${number}`, token)
      .then(setInvoice)
      .catch((e: Error) => setError(e.message));
  }, [number, token, router]);

  if (error) return <p className="error">{error}</p>;
  if (!invoice) return <p className="muted">Loading…</p>;

  return (
    <section className="panel">
      <h1 style={{ fontFamily: "var(--font-display)", marginTop: 0 }}>Hóa đơn {invoice.number}</h1>
      <p className="muted">
        {invoice.buyerName} · {invoice.buyerEmail} · {new Date(invoice.issuedAt).toLocaleString("vi-VN")}
      </p>
      <ul className="lesson-list">
        {invoice.order.items.map((item, i) => (
          <li key={`${item.product?.name ?? "item"}-${i}`}>
            <span>{item.product?.name ?? "Sản phẩm"}</span>
            <span>{formatVnd(item.unitAmountMinor)}</span>
          </li>
        ))}
      </ul>
      <p>Tạm tính: {formatVnd(invoice.subtotalMinor)}</p>
      <p>
        VAT ({invoice.vatBps / 100}%): {formatVnd(invoice.vatMinor)}
      </p>
      <p className="price">Tổng: {formatVnd(invoice.totalMinor)} {invoice.currency}</p>
    </section>
  );
}
