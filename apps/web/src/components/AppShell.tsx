"use client";

import type { ReactNode } from "react";
import { useAuth, hasRole } from "@/lib/auth";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout, ready } = useAuth();
  const teacher = hasRole(user, ["teacher", "admin"]);
  const admin = hasRole(user, ["admin", "support_agent"]);

  return (
    <div className="shell">
      <header className="top">
        <a className="brand" href="/">
          EduCommerce
        </a>
        <nav>
          <a href="/">Cửa hàng</a>
          {user && <a href="/library">Thư viện</a>}
          {user && <a href="/gplx">Ôn GPLX</a>}
          {user && <a href="/wishlist">Yêu thích</a>}
          {user && <a href="/certificates">Chứng chỉ</a>}
          {user && <a href="/invoices">Hóa đơn</a>}
          {user && <a href="/affiliate">Affiliate</a>}
          {user && <a href="/notifications">Thông báo</a>}
          {user && <a href="/account">Tài khoản</a>}
          {teacher && <a href="/teacher">Giảng viên</a>}
          {admin && <a href="/admin">Quản trị</a>}
          {!user && ready && <a href="/login">Đăng nhập</a>}
          {!user && ready && <a href="/register">Đăng ký</a>}
          {user && (
            <button type="button" className="secondary" onClick={() => void logout()}>
              Đăng xuất
            </button>
          )}
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
