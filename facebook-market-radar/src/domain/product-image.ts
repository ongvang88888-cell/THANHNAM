export function productImagePath(slug: string, title: string, nicheSlug: string): string {
  const params = new URLSearchParams({
    slug: slug.slice(0, 80),
    ten: title.slice(0, 80),
    nganh: nicheSlug.slice(0, 40),
  });
  return `/api/anh-san-pham?${params.toString()}`;
}

export function parseImageUrl(raw: string | undefined): string | null {
  if (raw === undefined) {
    return null;
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (trimmed.startsWith("/api/anh-san-pham")) {
    return trimmed;
  }
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error("Ảnh sản phẩm phải là URL http(s) hoặc /api/anh-san-pham");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Ảnh sản phẩm chỉ nhận http hoặc https");
  }
  return url.toString();
}

export function uniqueImageUrls(urls: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const url of urls) {
    if (!url || seen.has(url)) {
      continue;
    }
    seen.add(url);
    out.push(url);
  }
  return out;
}

export function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export const NICHE_COLORS: Record<string, { bg: string; fg: string }> = {
  "my-pham": { bg: "#5b3a6e", fg: "#f3d9ff" },
  "cham-soc-ca-nhan": { bg: "#6b3f5b", fg: "#ffd6ee" },
  tpcn: { bg: "#1f5a45", fg: "#c8f5df" },
  "thiet-bi-y-te": { bg: "#1b4f6b", fg: "#cfefff" },
  "me-be": { bg: "#7a4a2a", fg: "#ffe1c8" },
  "thu-cung": { bg: "#5a4a1f", fg: "#fff1b8" },
  "nha-cua": { bg: "#3d4f3a", fg: "#d9f0d2" },
  "nha-bep": { bg: "#6a3d2a", fg: "#ffd7c2" },
  "noi-that": { bg: "#3a3f5c", fg: "#d7dcff" },
  gadget: { bg: "#1f4d4a", fg: "#c6fff6" },
  "dien-tu": { bg: "#2a3d6b", fg: "#d4e4ff" },
  "dien-may": { bg: "#3d3d3d", fg: "#ececec" },
  "thoi-trang-nu": { bg: "#6b2f4a", fg: "#ffd0e2" },
  "thoi-trang-nam": { bg: "#2f3f6b", fg: "#d4dcff" },
  "giay-dep": { bg: "#4a3728", fg: "#f0d8c2" },
  "tui-vi": { bg: "#4a2f2f", fg: "#f3d0d0" },
  "trang-suc": { bg: "#5a4a1a", fg: "#ffe9a8" },
  "thuc-pham": { bg: "#4a5a20", fg: "#e8f5b8" },
  "do-uong": { bg: "#5a2f1f", fg: "#ffd4c2" },
  "o-to-xe-may": { bg: "#2a2a2a", fg: "#e0e0e0" },
  "the-thao": { bg: "#1f5a2f", fg: "#c8f5d4" },
  "khoa-hoc": { bg: "#2a3a6b", fg: "#d6e0ff" },
  "sach-vpp": { bg: "#3a4a5a", fg: "#dce8f0" },
  "do-choi": { bg: "#5a2a4a", fg: "#ffd0ee" },
  "nong-san": { bg: "#3a5a24", fg: "#d8f0b8" },
  khac: { bg: "#3a4148", fg: "#d7dde3" },
};

export function renderProductSvg(title: string, nicheSlug: string): string {
  const palette = NICHE_COLORS[nicheSlug] ?? NICHE_COLORS.khac;
  const bg = palette?.bg ?? "#3a4148";
  const fg = palette?.fg ?? "#d7dde3";
  const label = escapeXml(title.slice(0, 28) || "Sản phẩm");
  const initial = escapeXml((title.trim()[0] ?? "S").toUpperCase());
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160" role="img" aria-label="${label}">
  <rect width="160" height="160" rx="18" fill="${bg}"/>
  <circle cx="80" cy="58" r="28" fill="${fg}" opacity="0.18"/>
  <text x="80" y="70" text-anchor="middle" font-size="36" font-family="Be Vietnam Pro, Segoe UI, sans-serif" fill="${fg}" font-weight="700">${initial}</text>
  <text x="80" y="118" text-anchor="middle" font-size="11" font-family="Be Vietnam Pro, Segoe UI, sans-serif" fill="${fg}">${label}</text>
</svg>`;
}
