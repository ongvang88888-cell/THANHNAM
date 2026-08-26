"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UnicaLogo } from "@/components/UnicaLogo";
import { apiGet, apiPost } from "@/lib/api";
import { hasRole, safeNextPath, useAuth, type User } from "@/lib/auth";

const DEMO_PASSWORD = "Password123!";

const DEMO_ACCOUNTS = [
  { email: "student@edu.local", label: "Học viên", hint: "Không vào được /admin" },
  { email: "teacher@edu.local", label: "Giảng viên", hint: "Studio, không phải quản trị" },
  { email: "admin@edu.local", label: "Quản trị", hint: "Đúng tài khoản cho /admin" },
] as const;

function homeFor(user: User, next: string | null): string {
  if (next) return next;
  if (hasRole(user, ["admin", "support_agent"])) return "/admin";
  if (hasRole(user, ["teacher"])) return "/teacher";
  return "/library";
}

export default function LoginPage() {
  const { setSession } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("student@edu.local");
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loginWith(nextEmail: string, nextPassword: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await apiPost<{
        accessToken: string;
        refreshToken: string;
        user: { id: string; email: string; roles: string[]; appId: string };
      }>("/auth/login", { email: nextEmail, password: nextPassword });
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
      router.push(homeFor(user, next));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await loginWith(email, password);
  }

  return (
    <section className="u-auth">
      <UnicaLogo />
      <h1>Đăng nhập</h1>
      <p className="muted">Hội viên Unica — vào khóa học của tôi, giỏ hàng và studio giảng viên.</p>
      <div className="demo-accounts" role="group" aria-label="Tài khoản demo">
        {DEMO_ACCOUNTS.map((account) => (
          <button
            key={account.email}
            type="button"
            className={email === account.email ? "demo-account is-active" : "demo-account"}
            disabled={loading}
            onClick={() => {
              setEmail(account.email);
              setPassword(DEMO_PASSWORD);
            }}
          >
            <strong>{account.label}</strong>
            <span>{account.email}</span>
            <em>{account.hint}</em>
          </button>
        ))}
      </div>
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
      <p className="muted">
        Mật khẩu demo chung: <code>{DEMO_PASSWORD}</code>. Nút header hiện tên đầy đủ — quản trị phải hiện{" "}
        <strong>Platform Admin</strong>, không phải Demo.
      </p>
    </section>
  );
}
