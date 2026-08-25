"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api";
import { useAuth } from "@/lib/auth";

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
        user: { id: string; email: string; roles: string[]; appId: string };
      }>("/auth/login", { email, password });
      const me = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1"}/auth/me`,
        { headers: { Authorization: `Bearer ${res.accessToken}` } },
      ).then((r) => r.json());
      setSession(res.accessToken, {
        id: res.user.id,
        email: res.user.email,
        displayName: me.displayName,
        roles: res.user.roles,
        appId: res.user.appId,
      });
      router.push("/library");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel stack">
      <h1 style={{ fontFamily: "var(--font-display)", marginTop: 0 }}>Đăng nhập</h1>
      <p className="muted">Demo: student@edu.local / teacher@edu.local / admin@edu.local — Password123!</p>
      <form onSubmit={onSubmit}>
        <label>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} />
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="error">{error}</p>}
        <button disabled={loading} type="submit">
          {loading ? "..." : "Login"}
        </button>
      </form>
    </section>
  );
}
