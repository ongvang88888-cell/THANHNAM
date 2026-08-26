"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiPost } from "@/lib/api";
import { useAuth } from "@/lib/auth";

function VerifyInner() {
  const search = useSearchParams();
  const { token, user, setSession } = useAuth();
  const [status, setStatus] = useState("Đang xác minh…");
  const [error, setError] = useState<string | null>(null);
  const verifyToken = search.get("token");
  const authRef = useRef({ token, user, setSession });
  authRef.current = { token, user, setSession };

  useEffect(() => {
    if (!verifyToken) {
      setError("Thiếu token xác minh");
      setStatus("");
      return;
    }
    apiPost<{ ok: boolean }>("/auth/verify-email", { token: verifyToken })
      .then(() => {
        setStatus("Email đã được xác minh.");
        const current = authRef.current;
        if (current.token && current.user) {
          current.setSession(current.token, {
            ...current.user,
            emailVerifiedAt: new Date().toISOString(),
          });
        }
      })
      .catch((e: Error) => {
        setError(e.message);
        setStatus("");
      });
  }, [verifyToken]);

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
