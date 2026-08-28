import Link from "next/link";
import {
  formatObservedVi,
  hasPlatformData,
  officialLinkForTab,
  type PlatformDashboard,
  type PlatformTabId,
} from "@/domain/platform-dashboards";
import { ProductCell } from "@/ui/product-cell";
import { PlatformChips } from "@/ui/platform-chips";
import { formatMetric, primaryMetricLabel } from "@/ui/platform-metric";
import { WarehouseAutoRefresh } from "@/ui/warehouse-auto-refresh";

export function PlatformPanel({
  dashboard,
  base,
  niche,
  extra,
  limit,
  showTimeline = true,
  showCoverage = true,
}: {
  dashboard: PlatformDashboard;
  base: "home" | "kenh" | "trend";
  niche?: string;
  extra?: Record<string, string | undefined>;
  limit?: number;
  showTimeline?: boolean;
  showCoverage?: boolean;
}) {
  const tab = dashboard.tab.id;
  const ranked = limit ? dashboard.ranked.slice(0, limit) : dashboard.ranked;
  return (
    <section className="platform-panel">
      <PlatformChips active={tab} base={base} niche={niche} extra={extra} />
      <div className="banner">
        {dashboard.tab.honestyVi} Mọi số là <strong>ước lượng</strong> trên kho đã lưu — không phải dump toàn
        quốc. Tự động = tính lại từ thẻ + số bạn nhập, không phải crawler.
      </div>
      <WarehouseAutoRefresh />
      <p className="muted">
        Tính lại lúc {new Date(dashboard.recomputedMs).toLocaleString("vi-VN")} · {dashboard.withDataCount}/
        {dashboard.ranked.length} sản phẩm có số {dashboard.tab.labelVi} ·{" "}
        <a href={dashboard.sampleResearchUrl} target="_blank" rel="noreferrer">
          Mở trang chính thức
        </a>{" "}
        · <Link href={`/top/${tab}`}>999 tên nghiên cứu</Link> · <Link href="/collect">Nhập số</Link> ·{" "}
        <Link href="/tong-hop">Bảng đủ cột</Link>
      </p>
      {showCoverage ? <div className="cards platform-coverage">
        {dashboard.coverage.map((card) => (
          <Link
            key={card.id}
            href={
              base === "home"
                ? `/?kenh=${card.id}${niche ? `&niche=${niche}` : ""}`
                : base === "trend"
                  ? `/xu-huong?kenh=${card.id}`
                  : `/kenh/${card.id}`
            }
            className={card.id === tab ? "card on" : "card"}
          >
            <div className="n">{card.productsWithData}</div>
            <div className="muted">
              {card.labelVi} · {card.coveragePercent}% sản phẩm
            </div>
            <div className="muted">
              {card.valueLabelVi}: {formatMetric(card.metricSum) === "—" ? "0" : formatMetric(card.metricSum)}
            </div>
            <div className="muted">Cập nhật: {formatObservedVi(card.lastObservedMs, dashboard.recomputedMs)}</div>
          </Link>
        ))}
      </div> : null}
      <PlatformRankTable tab={tab} rows={ranked} nowMs={dashboard.recomputedMs} />
      {dashboard.ranked.length > ranked.length ? (
        <p>
          <Link href={`/kenh/${tab}`}>Xem đủ {dashboard.ranked.length} sản phẩm trên {dashboard.tab.labelVi}</Link>
        </p>
      ) : null}
      {showTimeline ? (
        <>
          <h3>Nhật ký số vừa ghi (liên tục từ kho)</h3>
          {dashboard.timeline.length === 0 ? (
            <p className="muted">
              Chưa có observation ngoài Facebook. Mở listing / Transparency, đọc số, rồi{" "}
              <Link href="/collect">nhập</Link>.
            </p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Khi nào</th>
                  <th>Sản phẩm</th>
                  <th>Kênh</th>
                  <th>Số</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.timeline.slice(0, 12).map((row, index) => (
                  <tr key={`${row.clusterSlug}-${row.source}-${row.observedMs}-${index}`}>
                    <td>{formatObservedVi(row.observedMs, dashboard.recomputedMs)}</td>
                    <td>
                      <Link href={`/san-pham/${row.clusterSlug}`}>{row.clusterTitle}</Link>
                    </td>
                    <td>{row.sourceLabelVi}</td>
                    <td>{formatMetric(row.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      ) : null}
    </section>
  );
}

function PlatformRankTable({
  tab,
  rows,
  nowMs,
}: {
  tab: PlatformTabId;
  rows: PlatformDashboard["ranked"];
  nowMs: number;
}) {
  if (rows.length === 0) {
    return <p className="muted">Chưa có sản phẩm trong kho. Lưu thẻ Facebook trước.</p>;
  }
  return (
    <div className="table-scroll">
      <table className="platform-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Sản phẩm</th>
            <th>Ngành</th>
            <th>Chỉ số kênh</th>
            <th>FB ads / nóng</th>
            <th>Lần ghi</th>
            <th>Mở trang chính thức</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.clusterSlug} className={hasPlatformData(row, tab) ? undefined : "dim"}>
              <td>{index + 1}</td>
              <td>
                <ProductCell
                  title={row.clusterTitle}
                  imageUrls={row.imageUrls}
                  href={`/san-pham/${row.clusterSlug}`}
                />
                <div className="muted">{row.priceLabel}</div>
              </td>
              <td>{row.nicheName}</td>
              <td>
                {primaryMetricLabel(tab, row)}
                {!hasPlatformData(row, tab) ? (
                  <div className="muted">Chưa nhập số kênh này</div>
                ) : null}
              </td>
              <td>
                {row.fbActiveAds} / {row.fbPages}
                <div>
                  <span className="badge warn">{row.fbHeat} ước lượng</span>
                </div>
              </td>
              <td>{formatObservedVi(row.lastObservedMs ?? row.lastSeenMs, nowMs)}</td>
              <td>
                <a href={officialLinkForTab(tab, row.clusterTitle)} target="_blank" rel="noreferrer">
                  Nghiên cứu
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
