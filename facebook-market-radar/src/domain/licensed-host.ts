/** Hosts Radar must never HTTP-GET, even if a licensed-feed URL is misconfigured. */
const BLOCKED_SUFFIXES = [
  "facebook.com",
  "fb.com",
  "fbcdn.net",
  "instagram.com",
  "cdninstagram.com",
  "meta.com",
  "whatsapp.com",
  "threads.net",
] as const;

export type LicensedUrlCheck =
  | { ok: true; href: string }
  | { ok: false; error: string };

function hostBlocked(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  return BLOCKED_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
}

export function assertLicensedFeedUrl(raw: string | undefined): LicensedUrlCheck {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) {
    return { ok: false, error: "Thiếu URL feed đã mua" };
  }
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { ok: false, error: "URL feed licensed không hợp lệ" };
  }
  if (url.protocol !== "https:") {
    return { ok: false, error: "Feed licensed chỉ nhận https" };
  }
  if (url.username || url.password) {
    return { ok: false, error: "Không nhúng mật khẩu trong URL feed" };
  }
  if (hostBlocked(url.hostname)) {
    return { ok: false, error: "Cấm HTTP GET Facebook / Instagram / Meta — dùng file JSON hoặc API vendor đã mua" };
  }
  return { ok: true, href: url.toString() };
}

export function isBlockedLicensedHost(hostname: string): boolean {
  return hostBlocked(hostname);
}
