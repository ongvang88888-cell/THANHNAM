"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";

export default function AccountPage() {
  const { token, user, ready, logout } = useRequireAuth();
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [exportJson, setExportJson] = useState<string | null>(null);

  if (!ready || !user) return <p className="muted">Loading…</p>;

  return (
    <section className="u-wrap panel stack" style={{ maxWidth: 640, margin: "28px auto" }}>
      <h1 style={{ marginTop: 0 }}>Tài khoản</h1>
      <p>
        {user.displayName || user.email}
        <br />
        <span className="muted">{user.email} · {user.roles.join(", ")}</span>
      </p>
      {user.emailVerifiedAt ? (
        <p className="ok">Email đã xác minh</p>
      ) : (
        <p className="muted">
          Email chưa xác minh.{" "}
          <button
            type="button"
            className="secondary"
            onClick={() => {
              if (!token) return;
              apiPost<{ verifyToken?: string }>("/auth/resend-verification", {}, token)
                .then((r) => {
                  setMsg(
                    r.verifyToken
                      ? `Dev token: mở /verify-email?token=${r.verifyToken}`
                      : "Đã gửi lại email xác minh.",
                  );
                })
                .catch((e: Error) => setMsg(e.message));
            }}
          >
            Gửi lại email
          </button>
        </p>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          className="secondary"
          onClick={() => {
            if (!token) return;
            apiGet<unknown>("/auth/export", token)
              .then((data) => setExportJson(JSON.stringify(data, null, 2)))
              .catch((e: Error) => setMsg(e.message));
          }}
        >
          Xuất dữ liệu
        </button>
        <button
          type="button"
          onClick={async () => {
            if (!token || !confirm("Xóa tài khoản? Hành động không hoàn tác.")) return;
            await apiPost("/auth/delete", {}, token);
            await logout();
            router.push("/");
          }}
        >
          Xóa tài khoản
        </button>
      </div>
      {msg && <p className="ok">{msg}</p>}
      {exportJson && (
        <pre style={{ overflow: "auto", maxHeight: 360, fontSize: 12 }}>{exportJson}</pre>
      )}
    </section>
  );
}
