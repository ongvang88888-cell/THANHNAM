import type { ResearchQuery } from "./research-query";
import { researchHref } from "./research-query";

const NETWORKS = [
  { id: "facebook", label: "Facebook", on: true },
  { id: "instagram", label: "Instagram", on: false },
  { id: "tiktok", label: "TikTok", on: false },
  { id: "youtube", label: "YouTube", on: false },
  { id: "x", label: "X", on: false },
  { id: "pinterest", label: "Pinterest", on: false },
] as const;

function chip(label: string, href: string) {
  return (
    <a className="spy-chip" href={href} key={label}>
      {label} ×
    </a>
  );
}

export function LibraryChrome({ query, action = "/" }: { query: ResearchQuery; action?: string }) {
  const chips: Array<{ label: string; href: string }> = [];
  if (query.ten) {
    chips.push({ label: `Keyword: ${query.ten}`, href: researchHref(action, query, { ten: undefined }) });
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
      <div className="spy-modes">
        <span className="on">Ad Info Search</span>
        <span className="off" title="Không so khớp ảnh/video trên Facebook">
          Feature Search
        </span>
        <span className="off" title="Không upload creative để tìm similar trên kho ads">
          Visual Search
        </span>
      </div>
      <div className="spy-industries">
        <span className="on">E-commerce</span>
        <span className="off">Game</span>
        <span className="off">Tool</span>
      </div>
      <div className="spy-networks" aria-label="Mạng">
        {NETWORKS.map((net) => (
          <span key={net.id} className={`net-pill${net.on ? " on" : " off"}`} title={net.on ? "VN · thẻ đã lưu" : "Chưa có dữ liệu — không crawl"}>
            {net.label}
          </span>
        ))}
        <span className="net-pill">Country: VN</span>
        <span className="net-pill">Language: VI</span>
      </div>
      <div className="spy-selected">
        <strong>Selected</strong>
        {chips.length === 0 ? <span className="muted">Industry: E-commerce · Time: trên thẻ đã lưu</span> : null}
        {chips.map((item) => chip(item.label, item.href))}
        {chips.length > 0 ? (
          <a className="spy-chip clear" href={action}>
            Clear
          </a>
        ) : null}
      </div>
    </div>
  );
}
