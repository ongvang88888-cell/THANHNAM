"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth, hasRole } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { UNICA_CATEGORIES } from "@/lib/unica-data";
import { SearchBox } from "./SearchBox";
import { UnicaLogo } from "./UnicaLogo";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout, ready } = useAuth();
  const { count } = useCart();
  const pathname = usePathname();
  const teacher = hasRole(user, ["teacher", "admin"]);
  const admin = hasRole(user, ["admin", "support_agent"]);
  const focus = pathname.startsWith("/learn/") || pathname.startsWith("/teacher/courses/");
  const [menuOpen, setMenuOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [activeCat, setActiveCat] = useState(UNICA_CATEGORIES[0]?.slug ?? "");
  const [mobileSearch, setMobileSearch] = useState(false);
  const megaRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  const currentCat = useMemo(
    () => UNICA_CATEGORIES.find((row) => row.slug === activeCat) ?? UNICA_CATEGORIES[0],
    [activeCat],
  );

  useEffect(() => {
    setMenuOpen(false);
    setMegaOpen(false);
    setAccountOpen(false);
    setMobileSearch(false);
  }, [pathname]);

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      const node = event.target as Node;
      if (!megaRef.current?.contains(node)) setMegaOpen(false);
      if (!accountRef.current?.contains(node)) setAccountOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="unica-root">
      <header className="u-header">
        <div className="u-header-inner">
          <button
            type="button"
            className="u-mob-toggle u-icon-btn"
            aria-label="Menu"
            onClick={() => setMenuOpen(true)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>

          <UnicaLogo />

          <div className="u-cat-wrap" ref={megaRef}>
            <button
              type="button"
              className={`u-cat-btn${megaOpen ? " is-on" : ""}`}
              aria-expanded={megaOpen}
              aria-label="Danh mục"
              onClick={() => setMegaOpen((open) => !open)}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
            </button>
            {megaOpen && currentCat && (
              <div className="u-mega" role="menu">
                <div className="u-mega-left">
                  {UNICA_CATEGORIES.map((cat) => (
                    <button
                      key={cat.slug}
                      type="button"
                      className={cat.slug === currentCat.slug ? "is-on" : undefined}
                      onMouseEnter={() => setActiveCat(cat.slug)}
                      onClick={() => setActiveCat(cat.slug)}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
                <div className="u-mega-right">
                  <a href={`/course/${currentCat.slug}`}>
                    <strong>Tất cả {currentCat.name}</strong>
                  </a>
                  {currentCat.children.map((child) => (
                    <a key={child.slug} href={`/course/${currentCat.slug}/${child.slug}`}>
                      {child.name}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="u-search-slot">
            <SearchBox />
          </div>

          <nav className="u-header-links">
            <a className="hide-sm" href="/doanh-nghiep">
              Doanh nghiệp
            </a>
            <a className="hide-sm" href="/hoi-vien">
              Hội viên
            </a>
            <button
              type="button"
              className="u-icon-btn u-mob-search"
              aria-label="Tìm kiếm"
              onClick={() => setMobileSearch((open) => !open)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
            </button>
            <a className="u-icon-btn" href="/cart" aria-label="Giỏ hàng">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M6 6h15l-1.5 9h-12z" />
                <circle cx="9" cy="20" r="1.4" />
                <circle cx="18" cy="20" r="1.4" />
                <path d="M6 6L5 3H2" />
              </svg>
              {count > 0 && <span className="u-cart-count">{count}</span>}
            </a>
            {!user && ready && (
              <a className="u-login-btn hide-md" href="/login">
                Đăng nhập
              </a>
            )}
            {user && (
              <div className="u-account" ref={accountRef}>
                <button
                  type="button"
                  className="u-login-btn"
                  aria-expanded={accountOpen}
                  onClick={() => setAccountOpen((open) => !open)}
                >
                  {user.displayName || user.email || "Tài khoản"}
                </button>
                {accountOpen && (
                  <div className="u-account-pop">
                    <p className="u-account-who">
                      <strong>{user.displayName || user.email}</strong>
                      <span>{user.email}</span>
                    </p>
                    <a href="/library">Khóa học của tôi</a>
                    <a href="/wishlist">Yêu thích</a>
                    <a href="/account">Tài khoản</a>
                    <a href="/certificates">Chứng chỉ</a>
                    <a href="/invoices">Hóa đơn</a>
                    <a href="/affiliate">Affiliate</a>
                    <a href="/notifications">Thông báo</a>
                    {teacher && <a href="/teacher">Studio giảng viên</a>}
                    {admin && <a href="/admin">Quản trị</a>}
                    {admin && <a href="/admin/courses">Quản lý khóa học</a>}
                    <button type="button" className="plain" onClick={() => void logout()}>
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            )}
          </nav>
        </div>
        {mobileSearch && (
          <div className="u-mob-search-row">
            <SearchBox />
          </div>
        )}
      </header>

      {menuOpen && (
        <div className="u-drawer" onClick={() => setMenuOpen(false)}>
          <div className="u-drawer-panel" onClick={(e) => e.stopPropagation()}>
            <UnicaLogo />
            <div className="u-drawer-auth">
              {user ? (
                <a href="/library">Khóa học của tôi</a>
              ) : (
                <>
                  <a href="/login">Đăng nhập</a>
                  <a href="/register">Đăng ký</a>
                </>
              )}
            </div>
            <a href="/kich-hoat">Kích hoạt khóa học</a>
            <a href="/hoi-vien">Hội viên</a>
            <a href="/doanh-nghiep">Doanh nghiệp</a>
            <p className="muted">Danh mục đào tạo</p>
            {UNICA_CATEGORIES.map((cat) => (
              <a key={cat.slug} href={`/course/${cat.slug}`}>
                {cat.name}
              </a>
            ))}
            <hr />
            <a href="/app">Tải app</a>
            <a href="/khoa-hoc">Tất cả khóa học</a>
            <a href="/giang-vien">Trở thành giảng viên</a>
            {teacher && <a href="/teacher">Studio giảng viên</a>}
            {admin && <a href="/admin">Quản trị</a>}
            {admin && <a href="/admin/courses">Quản lý khóa học</a>}
          </div>
        </div>
      )}

      <main className={`u-main${focus ? " is-focus" : ""}`}>{children}</main>

      {!focus && (
        <footer className="u-footer">
          <div className="u-wrap u-footer-grid">
            <div className="u-footer-brand">
              <UnicaLogo />
              <p>Học online cùng chuyên gia</p>
              <p>
                Hotline 1: 19001568
                <br />
                Hotline 2: 090 488 6095
                <br />
                Email: cskh@unica.vn
                <br />
                08h00 - 18h00, Thứ 2 - 7
              </p>
            </div>
            <div>
              <h4>Về Unica</h4>
              <ul>
                <li>
                  <a href="/about">Giới thiệu về Unica</a>
                </li>
                <li>
                  <a href="/faq">Hướng dẫn sử dụng</a>
                </li>
                <li>
                  <a href="/kich-hoat">Kích hoạt khóa học</a>
                </li>
                <li>
                  <a href="/blog">Góc chia sẻ</a>
                </li>
                <li>
                  <a href="/terms">Điều khoản dịch vụ</a>
                </li>
                <li>
                  <a href="/privacy">Chính sách bảo mật</a>
                </li>
              </ul>
            </div>
            <div>
              <h4>Hợp tác</h4>
              <ul>
                <li>
                  <a href="/giang-vien">Đăng ký giảng viên</a>
                </li>
                <li>
                  <a href="/doanh-nghiep">Giải pháp e-learning</a>
                </li>
                <li>
                  <a href="/doanh-nghiep">Đào tạo doanh nghiệp</a>
                </li>
                <li>
                  <a href="/giang-vien">Quay dựng video</a>
                </li>
                <li>
                  <a href="/khoa-hoc?type=doc">Xuất bản sách</a>
                </li>
                <li>
                  <a href="/affiliate">Affiliate</a>
                </li>
              </ul>
            </div>
            <div>
              <h4>Unica App</h4>
              <div className="u-app-btns">
                <a href="/app">App Store</a>
                <a href="/app">Google Play</a>
              </div>
              <h4>Kết nối với Unica</h4>
              <div className="u-social">
                <a href="/about" aria-label="YouTube">
                  YT
                </a>
                <a href="/about" aria-label="Facebook">
                  f
                </a>
                <a href="/about" aria-label="TikTok">
                  Tk
                </a>
              </div>
            </div>
          </div>
          <div className="u-wrap u-footer-legal">
            © Nền tảng học trực tuyến Unica — Học online mọi kỹ năng từ chuyên gia hàng đầu.
            <br />
            Giao diện cửa hàng dựng theo unica.vn trên hạ tầng trường học hiện có. Không sử dụng mã số thuế hay
            thương hiệu pháp lý của công ty Unica gốc.
          </div>
        </footer>
      )}

      {!focus && (
        <div className="u-chat">
          {chatOpen && (
            <div className="u-chat-pop">
              <button type="button" className="plain u-chat-close" onClick={() => setChatOpen(false)}>
                ×
              </button>
              Chào mừng bạn ghé thăm Unica. Mình có thể hỗ trợ gì cho bạn?
            </div>
          )}
          <button type="button" className="u-chat-btn" aria-label="Hỗ trợ" onClick={() => setChatOpen((open) => !open)}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M4 5h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
            </svg>
            <span className="u-chat-dot">1</span>
          </button>
        </div>
      )}
    </div>
  );
}
