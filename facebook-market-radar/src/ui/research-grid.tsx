import Link from "next/link";
import { CREATIVE_ANGLE_VI } from "@/domain/creative-angles";
import { LANDING_KIND_VI } from "@/domain/landing";
import { adRunSummary } from "@/domain/product-watch";
import type { ResearchRow } from "@/domain/saved-research";

export function ResearchGrid({ rows }: { rows: ResearchRow[] }) {
  return (
    <div className="research-grid">
      {rows.map((row) => {
        const cover = row.imageUrls[0];
        return (
          <article className="research-card" key={row.clusterSlug}>
            <Link href={`/san-pham/${row.clusterSlug}`} className="research-cover">
              {cover ? <img src={cover} alt="" /> : <div className="research-cover-empty">Chưa có ảnh</div>}
              <div className="research-hover">
                <p>{row.hook || "Chưa có hook từ nội dung đã lưu."}</p>
                <span className="badge">{row.scores.heat} ước lượng</span>
              </div>
            </Link>
            <div className="research-card-body">
              <Link href={`/san-pham/${row.clusterSlug}`}>
                <strong>{row.clusterTitle}</strong>
              </Link>
              <p className="muted">
                {row.nicheName} · {adRunSummary(row.activeAdCount, row.distinctPageCount, row.totalAdCount)}
              </p>
              <p className="product-price">{row.price.label}</p>
              <div className="chip-row">
                <span className={`badge ${row.lane === "fresh" ? "warn" : ""}`}>
                  {row.lane === "trending" ? "Trending" : row.lane === "fresh" ? "Fresh" : "Khác"}
                </span>
                {row.landingKinds.map((kind) => (
                  <span className="badge muted" key={kind}>
                    {LANDING_KIND_VI[kind]}
                  </span>
                ))}
                {row.angles.slice(0, 3).map((angle) => (
                  <span className="badge muted" key={angle}>
                    {CREATIVE_ANGLE_VI[angle]}
                  </span>
                ))}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
