import Link from "next/link";
import { PLATFORM_MENU_ORDER } from "@/domain/app-nav";
import type { PlatformCoverage, PlatformTabId } from "@/domain/platform-dashboards";
import { formatMetric } from "@/ui/platform-metric";

export function PlatformMatrix({
  coverage,
  active,
}: {
  coverage: readonly PlatformCoverage[];
  active: PlatformTabId;
}) {
  const byId = new Map(coverage.map((card) => [card.id, card]));
  const ordered = PLATFORM_MENU_ORDER.map((id) => byId.get(id)).filter(
    (card): card is PlatformCoverage => card !== undefined,
  );
  return (
    <section className="platform-matrix" aria-label="Thống kê từng nền tảng">
      <div className="section-head">
        <h2>Nền tảng / sàn</h2>
        <p className="muted">
          Số = kho đã lưu hoặc bạn nhập. Ô 999 tên = catalog nghiên cứu, không phải GMV toàn quốc.
        </p>
      </div>
      <div className="platform-matrix-grid">
        {ordered.map((card) => (
          <Link
            key={card.id}
            href={`/kenh/${card.id}`}
            className={card.id === active ? "pm-cell on" : "pm-cell"}
          >
            <span className="pm-name">{card.labelVi}</span>
            <span className="pm-n">{card.productsWithData}</span>
            <span className="pm-meta">
              {card.coveragePercent}% kho · {card.valueLabelVi}{" "}
              {formatMetric(card.metricSum) === "—" ? "0" : formatMetric(card.metricSum)}
            </span>
          </Link>
        ))}
        <Link href={`/top/${active}`} className="pm-cell catalog">
          <span className="pm-name">999 tên</span>
          <span className="pm-n">999</span>
          <span className="pm-meta">Catalog nghiên cứu / kênh đang chọn</span>
        </Link>
      </div>
    </section>
  );
}
