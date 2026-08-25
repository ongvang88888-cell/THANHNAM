"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost, formatVnd } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";

type Balance = {
  earnedMinor: number;
  reservedMinor: number;
  availableMinor: number;
  minPayoutMinor: number;
  codes: Array<{ id: string; code: string; commissionBps: number }>;
};

type Payout = {
  id: string;
  amountMinor: number;
  status: string;
  requestedAt: string;
};

export default function AffiliatePage() {
  const { token, ready } = useRequireAuth();
  const [balance, setBalance] = useState<Balance | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    if (!token) return;
    Promise.all([
      apiGet<Balance>("/affiliate/balance", token),
      apiGet<Payout[]>("/affiliate/payouts", token),
    ])
      .then(([b, p]) => {
        setBalance(b);
        setPayouts(p);
      })
      .catch((e: Error) => setError(e.message));
  }

  useEffect(() => {
    if (!ready || !token) return;
    load();
  }, [ready, token]);

  if (!balance) return <p className="muted">{error || "Loading…"}</p>;

  return (
    <section>
      <h1 style={{ fontFamily: "var(--font-display)" }}>Affiliate</h1>
      {error && <p className="error">{error}</p>}
      {msg && <p className="ok">{msg}</p>}
      <div className="grid">
        <div className="panel">
          <h3>Đã nhận</h3>
          <p style={{ fontSize: "1.4rem" }}>{formatVnd(balance.earnedMinor)}</p>
        </div>
        <div className="panel">
          <h3>Khả dụng</h3>
          <p style={{ fontSize: "1.4rem" }}>{formatVnd(balance.availableMinor)}</p>
        </div>
        <div className="panel">
          <h3>Tối thiểu rút</h3>
          <p style={{ fontSize: "1.4rem" }}>{formatVnd(balance.minPayoutMinor)}</p>
        </div>
      </div>
      <div className="panel" style={{ marginTop: 16 }}>
        <h2>Mã giới thiệu</h2>
        {balance.codes.length === 0 && <p className="muted">Bạn chưa có mã affiliate.</p>}
        <ul className="lesson-list">
          {balance.codes.map((c) => (
            <li key={c.id}>
              <strong>{c.code}</strong>
              <span className="muted">{c.commissionBps / 100}%</span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          disabled={balance.availableMinor < balance.minPayoutMinor}
          onClick={() => {
            if (!token) return;
            apiPost("/affiliate/payouts", { amountMinor: balance.availableMinor }, token)
              .then(() => {
                setMsg("Đã gửi yêu cầu rút");
                load();
              })
              .catch((e: Error) => setError(e.message));
          }}
        >
          Yêu cầu rút số khả dụng
        </button>
      </div>
      <div className="panel" style={{ marginTop: 16 }}>
        <h2>Lịch sử rút</h2>
        {payouts.length === 0 && <p className="muted">Chưa có yêu cầu.</p>}
        <ul className="lesson-list">
          {payouts.map((p) => (
            <li key={p.id}>
              <span>
                {p.status} · {formatVnd(p.amountMinor)}
              </span>
              <span className="muted">{new Date(p.requestedAt).toLocaleDateString("vi-VN")}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
