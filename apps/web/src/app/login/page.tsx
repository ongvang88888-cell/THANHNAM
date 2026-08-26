"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UnicaLogo } from "@/components/UnicaLogo";
import { apiGet, apiPost } from "@/lib/api";
import { safeNextPath, useAuth, type User } from "@/lib/auth";

export default function LoginPage() {
  const { setSession } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("student@edu.local");
  const [password, setPassword] = useState("Password123!");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await apiPost<{
        accessToken: string;
        refreshToken: string;
        user: { id: string; email: string; roles: string[]; appId: string };
      }>("/auth/login", { email, password });
      const me = await apiGet<{ displayName?: string; emailVerifiedAt?: string | null }>(
        "/auth/me",
        res.accessToken,
      );
      const user: User = {
        id: res.user.id,
        email: res.user.email,
        displayName: me.displayName,
        roles: res.user.roles,
        appId: res.user.appId,
        emailVerifiedAt: me.emailVerifiedAt,
      };
      setSession(res.accessToken, user, res.refreshToken);
      const next = safeNextPath(new URLSearchParams(window.location.search).get("next"));
      router.push(next ?? "/library");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="u-auth">
      <UnicaLogo />
      <h1>Đăng nhập</h1>
      <p className="muted">Hội viên Unica — vào khóa học của tôi, giỏ hàng và studio giảng viên.</p>
      <form onSubmit={onSubmit}>
        <label>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        <label>Mật khẩu</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        {error && <p className="toast error">{error}</p>}
        <button disabled={loading} type="submit">
          {loading ? "Đang vào…" : "Đăng nhập"}
        </button>
      </form>
      <p className="muted">
        <a href="/register">Đăng ký</a> · <a href="/forgot-password">Quên mật khẩu</a> ·{" "}
        <a href="/kich-hoat">Kích hoạt khóa học</a>
      </p>
      <p className="muted">Học viên / giảng viên / admin demo: student@edu.local · teacher@edu.local · admin@edu.local</p>
    </section>
  );
}
