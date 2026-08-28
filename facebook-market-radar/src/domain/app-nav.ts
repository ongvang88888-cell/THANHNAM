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

/** Trending và tổng quan mở Shopee trước — user đang tìm sàn. */
export const TRENDING_DEFAULT_PLATFORM: PlatformTabId = "shopee";

/** Thứ tự thống kê: sàn và Google/YouTube trước Facebook. */
export const PLATFORM_MENU_ORDER: readonly PlatformTabId[] = [
  "shopee",
  "lazada",
  "tiki",
  "sendo",
  "google",
  "youtube",
  "tiktok",
  "facebook",
  "instagram",
];

/** Menu khoa học: nền tảng trước, rồi phân tích, rồi kho. */
export const APP_NAV_GROUPS: readonly AppNavGroup[] = [
  {
    title: "Nền tảng",
    items: [
      { href: "/kenh/shopee", label: "Shopee", vi: "Đã bán đã nhập" },
      { href: "/kenh/lazada", label: "Lazada", vi: "Sàn" },
      { href: "/kenh/tiki", label: "Tiki", vi: "Sàn" },
      { href: "/kenh/sendo", label: "Sendo", vi: "Sàn" },
      { href: "/kenh/google", label: "Google", vi: "Ads Transparency" },
      { href: "/kenh/youtube", label: "YouTube", vi: "Video / ads đếm" },
      { href: "/kenh/tiktok", label: "TikTok", vi: "Shop + ads" },
      { href: "/kenh/facebook", label: "Facebook", vi: "Ads đã lưu" },
      { href: "/kenh/instagram", label: "Instagram", vi: "Placement IG" },
      { href: "/top/shopee", label: "999 tên", vi: "Catalog / kênh" },
    ],
  },
  {
    title: "Phân tích",
    items: [
      { href: "/", label: "Tổng quan", vi: "KPI + đa kênh" },
      { href: "/xu-huong", label: "Xu hướng", vi: "Mọi nền tảng" },
      { href: "/nganh", label: "Ngành", vi: "Xếp hạng ước lượng" },
      { href: "/tong-hop", label: "Tổng hợp", vi: "Bảng đủ cột" },
      { href: "/manh", label: "Ads mạnh", vi: "Ngưỡng trên kho" },
      { href: "/quet", label: "Quét cành", vi: "URL Thư viện" },
    ],
  },
  {
    title: "Kho",
    items: [
      { href: "/ads", label: "Ads đã lưu", vi: "Từng thẻ" },
      { href: "/collect", label: "Nhập số", vi: "Collect + sàn" },
      { href: "/theo-doi", label: "Theo dõi", vi: "Trang đã lưu" },
      { href: "/bo-suu-tap", label: "Bộ sưu tập", vi: "Swipe file" },
      { href: "/alerts", label: "Cảnh báo", vi: "Trên kho" },
      { href: "/report", label: "Báo cáo", vi: "Tuần" },
      { href: "/own-ads", label: "Ads của tôi", vi: "Tài khoản" },
      { href: "/niches", label: "Danh mục", vi: "26 ngành" },
    ],
  },
];

export const TOP_PLATFORM_PILLS: readonly { id: PlatformTabId; href: string; label: string }[] =
  PLATFORM_MENU_ORDER.map((id) => {
    const tab = PLATFORM_TABS.find((item) => item.id === id);
    return {
      id,
      href: `/kenh/${id}`,
      label: tab?.labelVi ?? id,
    };
  });

export function isActiveNav(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function platformIdFromPath(pathname: string, kenh?: string | null): PlatformTabId {
  if (kenh && PLATFORM_TABS.some((tab) => tab.id === kenh)) {
    return kenh as PlatformTabId;
  }
  const kenhPath = pathname.match(/^\/kenh\/([a-z-]+)/);
  if (kenhPath?.[1] && PLATFORM_TABS.some((tab) => tab.id === kenhPath[1])) {
    return kenhPath[1] as PlatformTabId;
  }
  const top = pathname.match(/^\/top\/([a-z-]+)/);
  if (top?.[1] && PLATFORM_TABS.some((tab) => tab.id === top[1])) {
    return top[1] as PlatformTabId;
  }
  if (pathname === "/xu-huong" || pathname.startsWith("/xu-huong/") || pathname === "/") {
    return TRENDING_DEFAULT_PLATFORM;
  }
  return "facebook";
}

export function listPlatformNavHrefs(): string[] {
  return APP_NAV_GROUPS[0]?.items.map((item) => item.href) ?? [];
}
