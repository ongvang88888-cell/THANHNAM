"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, formatVnd } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function AdminPage() {
  const { token, user } = useAuth();
  const router = useRouter();
  const [dash, setDash] = useState<{
    users: number;
    products: number;
    paidOrders: number;
    activeEntitlements: number;
    revenueMinor: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    apiGet<typeof dash extends null ? never : NonNullable<typeof dash>>("/admin/dashboard", token)
      .then(setDash)
      .catch((e) => setError(e.message));
  }, [token, router]);

  return (
    <section>
      <h1 style={{ fontFamily: "var(--font-display)" }}>Admin</h1>
      <p className="muted">Dùng admin@edu.local</p>
      {user && <p>{user.email}</p>}
      {error && <p className="error">{error}</p>}
      {dash && (
        <div className="grid">
          <div className="panel"><h3>Users</h3><p style={{ fontSize: "2rem" }}>{dash.users}</p></div>
          <div className="panel"><h3>Products</h3><p style={{ fontSize: "2rem" }}>{dash.products}</p></div>
          <div className="panel"><h3>Paid orders</h3><p style={{ fontSize: "2rem" }}>{dash.paidOrders}</p></div>
          <div className="panel"><h3>Entitlements</h3><p style={{ fontSize: "2rem" }}>{dash.activeEntitlements}</p></div>
          <div className="panel"><h3>Revenue</h3><p style={{ fontSize: "1.4rem" }}>{formatVnd(dash.revenueMinor)}</p></div>
        </div>
      )}
    </section>
  );
}
