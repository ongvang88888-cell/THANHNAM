import { PLATFORM_TABS, type PlatformTabId } from "./platform-dashboards";

export type AppNavItem = {
  href: string;
  label: string;
  vi: string;
};

export type AppNavGroup = {
  title: string;
  items: readonly AppNavItem[];
};

/** Menu người dùng đang mở trên mobile — nền tảng phải nằm trên cùng, không chỉ Facebook. */
export const APP_NAV_GROUPS: readonly AppNavGroup[] = [
  {
    title: "Nền tảng / sàn",
    items: [
      { href: "/kenh/shopee", label: "Shopee", vi: "Sàn — số đã nhập" },
      { href: "/kenh/lazada", label: "Lazada", vi: "Sàn" },
      { href: "/kenh/tiki", label: "Tiki", vi: "Sàn" },
      { href: "/kenh/sendo", label: "Sendo", vi: "Sàn" },
      { href: "/kenh/google", label: "Google", vi: "Ads Transparency" },
      { href: "/kenh/youtube", label: "YouTube", vi: "Video / ads đã đếm" },
      { href: "/kenh/tiktok", label: "TikTok", vi: "Shop + ads" },
      { href: "/kenh/facebook", label: "Facebook", vi: "Thư viện ads đã lưu" },
      { href: "/kenh/instagram", label: "Instagram", vi: "Placement IG" },
      { href: "/top/shopee", label: "999 products", vi: "999 tên / mỗi kênh" },
    ],
  },
  {
    title: "Ad Library",
    items: [
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
    ],
  },
];

export const TOP_PLATFORM_PILLS: readonly { id: PlatformTabId; href: string; label: string }[] = PLATFORM_TABS.map(
  (tab) => ({
    id: tab.id,
    href: `/kenh/${tab.id}`,
    label: tab.labelVi,
  }),
);

export function isActiveNav(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function platformIdFromPath(pathname: string): PlatformTabId {
  const kenh = pathname.match(/^\/kenh\/([a-z-]+)/);
  if (kenh?.[1] && PLATFORM_TABS.some((tab) => tab.id === kenh[1])) {
    return kenh[1] as PlatformTabId;
  }
  const top = pathname.match(/^\/top\/([a-z-]+)/);
  if (top?.[1] && PLATFORM_TABS.some((tab) => tab.id === top[1])) {
    return top[1] as PlatformTabId;
  }
  return "facebook";
}

export function listPlatformNavHrefs(): string[] {
  return APP_NAV_GROUPS[0]?.items.map((item) => item.href) ?? [];
}
