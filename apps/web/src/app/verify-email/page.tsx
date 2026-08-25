"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiPost } from "@/lib/api";
import { useAuth } from "@/lib/auth";

function VerifyInner() {
  const search = useSearchParams();
  const { token, user, setSession } = useAuth();
  const [status, setStatus] = useState("Đang xác minh…");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyToken = search.get("token");
    if (!verifyToken) {
      setError("Thiếu token xác minh");
      setStatus("");
      return;
    }
    apiPost<{ ok: boolean }>("/auth/verify-email", { token: verifyToken })
      .then(() => {
        setStatus("Email đã được xác minh.");
        if (token && user) {
          setSession(token, { ...user, emailVerifiedAt: new Date().toISOString() });
        }
      })
      .catch((e: Error) => {
        setError(e.message);
        setStatus("");
      });
  }, [search, token, user, setSession]);

  return (
    <section className="panel">
      <h1 style={{ fontFamily: "var(--font-display)" }}>Xác minh email</h1>
      {status && <p className="ok">{status}</p>}
      {error && <p className="error">{error}</p>}
      <p>
        <a href="/login">Đăng nhập</a> · <a href="/account">Tài khoản</a>
      </p>
    </section>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<p className="muted">Loading…</p>}>
      <VerifyInner />
    </Suspense>
  );
}
