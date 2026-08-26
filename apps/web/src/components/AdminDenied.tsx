"use client";

import { useAuth } from "@/lib/auth";

const ADMIN_EMAIL = "admin@edu.local";

export function AdminDenied({ nextPath }: { nextPath: string }) {
  const { user, logout } = useAuth();
  const roles = user?.roles?.length ? user.roles.join(", ") : "không có vai trò";

  async function switchToAdmin() {
    await logout();
    window.location.assign(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  return (
    <section className="u-wrap admin-denied">
      <p className="error">Tài khoản này không có quyền quản trị.</p>
      <p>
        Bạn đang đăng nhập <strong>{user?.email ?? "chưa rõ"}</strong>
        {user?.displayName ? ` (${user.displayName})` : ""}. Vai trò: {roles}.
      </p>
      <p>
        Tài khoản quản trị chuẩn: <strong>{ADMIN_EMAIL}</strong> / <code>Password123!</code>
      </p>
      <p className="muted">
        Form đăng nhập mặc định là học viên. Phải đăng xuất trước, rồi chọn ô Quản trị hoặc điền đúng email admin.
      </p>
      <button type="button" onClick={() => void switchToAdmin()}>
        Đăng xuất và vào quản trị
      </button>
    </section>
  );
}
