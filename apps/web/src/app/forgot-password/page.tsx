"use client";

import { useState } from "react";
import { apiPost } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await apiPost<{ ok: boolean; resetToken?: string }>("/auth/forgot", { email });
      setResetToken(res.resetToken ?? null);
      setMsg("Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Không gửi được");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel stack">
      <h1 style={{ fontFamily: "var(--font-display)", marginTop: 0 }}>Quên mật khẩu</h1>
      <form onSubmit={onSubmit}>
        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <button disabled={busy} type="submit">
          {busy ? "..." : "Gửi link đặt lại"}
        </button>
      </form>
      {msg && <p className="ok">{msg}</p>}
      {resetToken && (
        <p className="muted">
          Dev token: <a href={`/reset-password?token=${encodeURIComponent(resetToken)}`}>đặt lại ngay</a>
        </p>
      )}
    </section>
  );
}
