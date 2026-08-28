"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV = [
  { href: "/", label: "Ad Library", vi: "Thư viện ads" },
  { href: "/quet", label: "Ad Search", vi: "Quét cành" },
  { href: "/theo-doi", label: "Ad Pages", vi: "Theo dõi trang" },
  { href: "/xu-huong", label: "Trending", vi: "Xu hướng" },
  { href: "/nganh", label: "Rankings", vi: "Xếp hạng ngành" },
  { href: "/bo-suu-tap", label: "Collection", vi: "Bộ sưu tập" },
  { href: "/collect", label: "Save Ad", vi: "Lưu quảng cáo" },
  { href: "/ads", label: "Saved Ads", vi: "Ads đã lưu" },
  { href: "/alerts", label: "Alerts", vi: "Cảnh báo" },
  { href: "/own-ads", label: "My Ads", vi: "Tài khoản của tôi" },
  { href: "/report", label: "Report", vi: "Báo cáo tuần" },
  { href: "/niches", label: "Niches", vi: "Danh mục ngành" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);

  return (
    <div className="spy-app">
      {open ? (
        <button type="button" className="spy-backdrop" aria-label="Đóng menu" onClick={() => setOpen(false)} />
      ) : null}
      <aside className={`spy-side${open ? " open" : ""}`}>
        <Link href="/" className="spy-logo" onClick={() => setOpen(false)}>
          <span className="spy-mark" aria-hidden="true">
            ⌕
          </span>
          <span>
            <b>Radar</b>
            <small>Ad Library</small>
          </span>
        </Link>
        <p className="spy-side-kicker">Ad Library · Việt Nam</p>
        <nav className="spy-nav">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={isActive(pathname, item.href) ? "on" : ""}
              onClick={() => setOpen(false)}
            >
              <span>{item.label}</span>
              <small>{item.vi}</small>
            </Link>
          ))}
        </nav>
        <p className="spy-side-note">Chỉ thẻ bạn đã lưu. Không kéo Facebook. Điểm nóng ước lượng.</p>
      </aside>
      <div className="spy-main">
        <header className="spy-top">
          <button type="button" className="spy-menu" onClick={() => setOpen((value) => !value)}>
            Menu
          </button>
          <form className="spy-search" action="/" method="get">
            <input name="ten" placeholder="Search saved ads — tên, hook, ngành…" aria-label="Tìm ads đã lưu" />
            <button type="submit">Search</button>
          </form>
          <div className="spy-top-meta">
            <span className="net-pill on">Facebook</span>
            <span className="net-pill">VN</span>
            <span className="net-pill">Tiếng Việt</span>
          </div>
        </header>
        <div className="spy-page">{children}</div>
      </div>
    </div>
  );
}
