import { TOP_PLATFORM_PILLS } from "@/domain/app-nav";
import { parsePlatformTab, type PlatformTabId } from "@/domain/platform-dashboards";
import type { ResearchQuery } from "./research-query";
import { researchHref } from "./research-query";

export function libraryChromePlatforms(): readonly { id: string; href: string; label: string }[] {
  return TOP_PLATFORM_PILLS;
}

function chip(label: string, href: string) {
  return (
    <a className="spy-chip" href={href} key={label}>
      {label} ×
    </a>
  );
}

export function LibraryChrome({
  query,
  action = "/",
  defaultPlatform = "shopee",
}: {
  query: ResearchQuery;
  action?: string;
  defaultPlatform?: PlatformTabId;
}) {
  const active = parsePlatformTab(query.kenh, defaultPlatform);
  const chips: Array<{ label: string; href: string }> = [];
  if (query.ten) {
    chips.push({ label: `Từ khóa: ${query.ten}`, href: researchHref(action, query, { ten: undefined }) });
  }
  if (query.group) {
    chips.push({ label: `Nhóm: ${query.group}`, href: researchHref(action, query, { group: undefined }) });
  }
  if (query.niche) {
    chips.push({ label: `Ngành: ${query.niche}`, href: researchHref(action, query, { niche: undefined }) });
  }
  if (query.lane && query.lane !== "all") {
    chips.push({ label: `Làn: ${query.lane}`, href: researchHref(action, query, { lane: undefined }) });
  }
  if (query.landing === "yes" || query.landing === "no") {
    chips.push({ label: `Landing: ${query.landing}`, href: researchHref(action, query, { landing: undefined }) });
  }
  if (query.landingKind) {
    chips.push({ label: `Đích: ${query.landingKind}`, href: researchHref(action, query, { landingKind: undefined }) });
  }
  if (query.angle) {
    chips.push({ label: `Góc: ${query.angle}`, href: researchHref(action, query, { angle: undefined }) });
  }
  if (query.media) {
    chips.push({ label: `Format: ${query.media}`, href: researchHref(action, query, { media: undefined }) });
  }
  if (query.minDays) {
    chips.push({ label: `Ngày ≥ ${query.minDays}`, href: researchHref(action, query, { minDays: undefined }) });
  }
  if (query.minPages) {
    chips.push({ label: `Trang ≥ ${query.minPages}`, href: researchHref(action, query, { minPages: undefined }) });
  }
  if (query.shop) {
    chips.push({ label: `Shop: ${query.shop}`, href: researchHref(action, query, { shop: undefined }) });
  }
  if (query.minPrice) {
    chips.push({ label: `Giá từ ${query.minPrice}`, href: researchHref(action, query, { minPrice: undefined }) });
  }
  if (query.maxPrice) {
    chips.push({ label: `Giá đến ${query.maxPrice}`, href: researchHref(action, query, { maxPrice: undefined }) });
  }

  return (
    <div className="spy-chrome">
      <div className="spy-networks" aria-label="Nền tảng và sàn">
        {libraryChromePlatforms().map((net) => (
          <a
            key={net.id}
            href={net.href}
            className={`net-pill${net.id === active ? " on" : ""}`}
          >
            {net.label}
          </a>
        ))}
      </div>
      <div className="spy-selected">
        <strong>Đang lọc</strong>
        {chips.length === 0 ? (
          <span className="muted">Kho đã lưu · số bạn nhập · không crawl</span>
        ) : null}
        {chips.map((item) => chip(item.label, item.href))}
        {chips.length > 0 ? (
          <a className="spy-chip clear" href={action}>
            Xóa lọc
          </a>
        ) : null}
      </div>
    </div>
  );
}
