"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useAuth, hasRole } from "@/lib/auth";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout, ready } = useAuth();
  const teacher = hasRole(user, ["teacher", "admin"]);
  const admin = hasRole(user, ["admin", "support_agent"]);
  const path = usePathname() || "/";
  const onGplx = path.startsWith("/gplx");

  const link = (href: string, label: string) => (
    <a
      href={href}
      className={
        path === href || (href !== "/" && path.startsWith(href)) ? "nav-active" : undefined
      }
    >
      {label}
    </a>
  );

  return (
    <div className="shell">
      <header className="top">
        <a className="brand" href={onGplx ? "/gplx" : "/"}>
          <span className="brand-mark">{onGplx ? "Đ" : "E"}</span>
          {onGplx ? "Đậu GPLX" : "EduCommerce"}
        </a>
        <nav className="top-nav" aria-label="Chính">
          {link("/", "Cửa hàng")}
          {user && link("/gplx", "Ôn GPLX")}
          {user && link("/library", "Thư viện")}
          {user && link("/account", "Tài khoản")}
          {teacher && link("/teacher", "Giảng viên")}
          {admin && link("/admin", "Quản trị")}
          {!user && ready && link("/login", "Đăng nhập")}
          {!user && ready && link("/register", "Đăng ký")}
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
