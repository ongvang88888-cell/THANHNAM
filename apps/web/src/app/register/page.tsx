"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api";
import { useAuth, type User } from "@/lib/auth";

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
      router.push(res.verifyToken ? `/verify-email?token=${encodeURIComponent(res.verifyToken)}` : "/library");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng ký thất bại");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel stack">
      <h1 style={{ fontFamily: "var(--font-display)", marginTop: 0 }}>Tạo tài khoản</h1>
      <p className="muted">Đăng ký học viên. Chúng tôi sẽ gửi email xác minh (hoặc hiện token ở môi trường dev).</p>
      <form onSubmit={onSubmit}>
        <label>Tên hiển thị</label>
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
          {loading ? "..." : "Đăng ký"}
        </button>
      </form>
      <p className="muted">
        Đã có tài khoản? <a href="/login">Đăng nhập</a>
      </p>
    </section>
  );
}
