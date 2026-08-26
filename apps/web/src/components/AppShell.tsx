"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth, hasRole } from "@/lib/auth";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout, ready } = useAuth();
  const pathname = usePathname();
  const teacher = hasRole(user, ["teacher", "admin"]);
  const admin = hasRole(user, ["admin", "support_agent"]);
  const focus = pathname.startsWith("/learn/") || pathname.startsWith("/teacher/courses/");
  const [navOpen, setNavOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNavOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (!accountRef.current?.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className={`shell${focus ? " is-focus" : ""}`}>
      <header className="top">
        <a className="brand" href={user ? "/library" : "/"}>
          EduCommerce
        </a>
        <button
          type="button"
          className="nav-toggle ghost"
          aria-expanded={navOpen}
          onClick={() => setNavOpen((open) => !open)}
        >
          Menu
        </button>
        <nav className={navOpen ? "is-open" : undefined}>
          <a href="/" className={pathname === "/" ? "is-current" : undefined}>
            Cửa hàng
          </a>
          {user && (
            <a href="/library" className={pathname.startsWith("/library") ? "is-current" : undefined}>
              Thư viện
            </a>
          )}
          {teacher && (
            <a href="/teacher" className={pathname.startsWith("/teacher") ? "is-current" : undefined}>
              Studio
            </a>
          )}
          {admin && (
            <a href="/admin" className={pathname.startsWith("/admin") ? "is-current" : undefined}>
              Quản trị
            </a>
          )}
          {!user && ready && <a href="/login">Đăng nhập</a>}
          {!user && ready && (
            <a className="btn btn-sm" href="/register">
              Đăng ký
            </a>
          )}
          {user && (
            <div className="account-menu" ref={accountRef}>
              <button
                type="button"
                className="account-chip ghost"
                aria-expanded={accountOpen}
                onClick={() => setAccountOpen((open) => !open)}
              >
                {user.displayName || user.email}
              </button>
              {accountOpen && (
                <div className="account-pop">
                  <a href="/account">Tài khoản</a>
                  <a href="/wishlist">Yêu thích</a>
                  <a href="/certificates">Chứng chỉ</a>
                  <a href="/invoices">Hóa đơn</a>
                  <a href="/affiliate">Affiliate</a>
                  <a href="/notifications">Thông báo</a>
                  <button type="button" className="plain" onClick={() => void logout()}>
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          )}
        </nav>
      </header>
      <main>{children}</main>
      {!focus && (
        <footer className="site-footer">
          <a href="/privacy">Quyền riêng tư</a>
          <a href="/terms">Điều khoản</a>
          <a href="/data-deletion">Xóa dữ liệu</a>
        </footer>
      )}
    </div>
  );
}
