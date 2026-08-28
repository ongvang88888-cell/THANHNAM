"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { APP_NAV_GROUPS, isActiveNav, platformIdFromPath, TOP_PLATFORM_PILLS } from "@/domain/app-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const [kenh, setKenh] = useState<string | null>(null);

  useEffect(() => {
    setKenh(new URLSearchParams(window.location.search).get("kenh"));
  }, [pathname]);

  const activePlatform = platformIdFromPath(pathname, kenh);

  return (
    <div className="spy-app">
      {open ? (
        <button type="button" className="spy-backdrop" aria-label="Đóng menu" onClick={() => setOpen(false)} />
      ) : null}
      <aside className={`spy-side${open ? " open" : ""}`}>
        <Link href="/kenh/shopee" className="spy-logo" onClick={() => setOpen(false)}>
          <span className="spy-mark" aria-hidden="true">
            ⌕
          </span>
          <span>
            <b>Radar</b>
            <small>Ads &amp; sàn</small>
          </span>
        </Link>
        <p className="spy-side-kicker">Shopee · Google · YouTube · Facebook</p>
        <nav className="spy-nav" aria-label="Menu Radar">
          {APP_NAV_GROUPS.map((group) => (
            <div key={group.title} className="spy-nav-group">
              <p className="spy-side-kicker">{group.title}</p>
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={isActiveNav(pathname, item.href) ? "on" : ""}
                  onClick={() => setOpen(false)}
                >
                  <span>{item.label}</span>
                  <small>{item.vi}</small>
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <p className="spy-side-note">
          Dòng đầu menu là Shopee / Google / YouTube — không chỉ Facebook. Số sàn = bạn nhập. Radar không crawl.
        </p>
      </aside>
      <div className="spy-main">
        <header className="spy-top">
          <button type="button" className="spy-menu secondary" onClick={() => setOpen((value) => !value)}>
            Menu
          </button>
          <form className="spy-search" action="/" method="get">
            <input name="ten" placeholder="Search saved ads — tên, hook, ngành…" aria-label="Tìm ads đã lưu" />
            <button type="submit">Search</button>
          </form>
          <div className="spy-top-meta" aria-label="Nền tảng">
            {TOP_PLATFORM_PILLS.map((pill) => (
              <Link
                key={pill.id}
                href={pill.href}
                className={pill.id === activePlatform ? "net-pill on" : "net-pill"}
              >
                {pill.label}
              </Link>
            ))}
          </div>
        </header>
        <div className="spy-page">{children}</div>
      </div>
    </div>
  );
}
