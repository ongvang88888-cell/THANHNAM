"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UnicaLogo } from "@/components/UnicaLogo";
import { apiGet, apiPost } from "@/lib/api";
import { safeNextPath, useAuth, type User } from "@/lib/auth";

export default function RegisterPage() {
  const { setSession } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        verifyToken?: string;
        user: { id: string; email: string; roles: string[]; appId: string };
      }>("/auth/register", { email, password, displayName });
      const me = await apiGet<{ displayName?: string; emailVerifiedAt?: string | null }>(
        "/auth/me",
        res.accessToken,
      );
      const user: User = {
        id: res.user.id,
        email: res.user.email,
        displayName: me.displayName ?? displayName,
        roles: res.user.roles,
        appId: res.user.appId,
        emailVerifiedAt: me.emailVerifiedAt,
      };
      setSession(res.accessToken, user, res.refreshToken);
      const next = safeNextPath(new URLSearchParams(window.location.search).get("next"));
      if (res.verifyToken) {
        const verify = `/verify-email?token=${encodeURIComponent(res.verifyToken)}`;
        router.push(next ? `${verify}&next=${encodeURIComponent(next)}` : verify);
      } else {
        router.push(next ?? "/library");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng ký thất bại");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="u-auth">
      <UnicaLogo />
      <h1>Đăng ký</h1>
      <p className="muted">Tạo tài khoản hội viên để học online mọi kỹ năng từ chuyên gia hàng đầu.</p>
      <form onSubmit={onSubmit}>
        <label>Họ và tên</label>
        <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label>Mật khẩu (tối thiểu 8 ký tự)</label>
        <input
          type="password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="error">{error}</p>}
        <button disabled={loading} type="submit">
          {loading ? "Đang tạo…" : "Đăng ký"}
        </button>
      </form>
      <p className="muted">
        Đã có tài khoản? <a href="/login">Đăng nhập</a>
      </p>
    </section>
  );
}
