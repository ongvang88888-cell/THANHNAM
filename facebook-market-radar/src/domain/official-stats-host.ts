/** Official partner/API hosts Radar may HTTP-call. Marketplace HTML is still blocked. */

export const OFFICIAL_STATS_HOSTS = [
  { host: "www.googleapis.com", pathPrefix: "/youtube/v3/videos" },
  { host: "www.googleapis.com", pathPrefix: "/youtube/v3/search" },
  { host: "www.googleapis.com", pathPrefix: "/customsearch/v1" },
  { host: "partner.shopeemobile.com", pathPrefix: "/api/v2/" },
  { host: "api.lazada.vn", pathPrefix: "/rest/" },
  { host: "api.lazada.com", pathPrefix: "/rest/" },
  { host: "open-api.tiktokglobalshop.com", pathPrefix: "/" },
] as const;

export type OfficialStatsUrlCheck =
  | { ok: true; href: string }
  | { ok: false; error: string };

function pathAllowed(hostname: string, pathname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  const path = pathname || "/";
  return OFFICIAL_STATS_HOSTS.some((rule) => {
    const matchHost = host === rule.host;
    if (!matchHost) {
      return false;
    }
    return path === rule.pathPrefix || path.startsWith(rule.pathPrefix);
  });
}

export function assertOfficialStatsUrl(raw: string): OfficialStatsUrlCheck {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: "Thiếu URL API chính thức" };
  }
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { ok: false, error: "URL API không hợp lệ" };
  }
  if (url.protocol !== "https:") {
    return { ok: false, error: "API thống kê chỉ nhận https" };
  }
  if (url.username || url.password) {
    return { ok: false, error: "Không nhúng mật khẩu trong URL API" };
  }
  if (!pathAllowed(url.hostname, url.pathname)) {
    return {
      ok: false,
      error:
        "Cấm HTTP GET HTML sàn / YouTube / Transparency — chỉ googleapis, Shopee Open, Lazada Open, TikTok Shop Open",
    };
  }
  return { ok: true, href: url.toString() };
}

export function isOfficialStatsHost(hostname: string, pathname = "/"): boolean {
  return pathAllowed(hostname, pathname);
}
