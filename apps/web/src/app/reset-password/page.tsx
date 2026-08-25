"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiPost } from "@/lib/api";

function ResetInner() {
  const search = useSearchParams();
  const router = useRouter();
  const [token, setToken] = useState(search.get("token") ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiPost("/auth/reset", { token, password });
      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đặt lại thất bại");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel stack">
      <h1 style={{ fontFamily: "var(--font-display)", marginTop: 0 }}>Đặt lại mật khẩu</h1>
      <form onSubmit={onSubmit}>
        <label>Token</label>
        <input value={token} onChange={(e) => setToken(e.target.value)} required />
        <label>Mật khẩu mới</label>
        <input
          type="password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="error">{error}</p>}
        <button disabled={busy} type="submit">
          {busy ? "..." : "Cập nhật mật khẩu"}
        </button>
      </form>
    </section>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<p className="muted">Loading…</p>}>
      <ResetInner />
    </Suspense>
  );
}
