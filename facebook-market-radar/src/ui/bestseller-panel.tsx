import Link from "next/link";
import { LOCKED_NICHES } from "@/domain/niches";
import { platformTab, type PlatformTabId } from "@/domain/platform-dashboards";
import {
  topHref,
  type PlatformBestsellerPage,
  type WarehouseOverlay,
} from "@/domain/platform-bestsellers";
import { PlatformChips } from "@/ui/platform-chips";
import { formatMetric } from "@/ui/platform-metric";

function overlayLabel(tab: PlatformTabId, overlay: WarehouseOverlay | null): string {
  if (!overlay) {
    return "— chưa lưu";
  }
  switch (tab) {
    case "shopee":
      return overlay.soldShopee === null ? "kho: chưa có Shopee" : `kho: ${formatMetric(overlay.soldShopee)} đã bán`;
    case "lazada":
      return overlay.soldLazada === null ? "kho: chưa có Lazada" : `kho: ${formatMetric(overlay.soldLazada)} đã bán`;
    case "tiki":
      return overlay.soldTiki === null ? "kho: chưa có Tiki" : `kho: ${formatMetric(overlay.soldTiki)} đã bán`;
    case "sendo":
      return overlay.soldSendo === null ? "kho: chưa có Sendo" : `kho: ${formatMetric(overlay.soldSendo)} đã bán`;
    case "tiktok":
      return `kho: bán ${formatMetric(overlay.soldTiktok)} · ads ${formatMetric(overlay.tiktokAdsSeen)}`;
    case "google":
      return `kho: ${formatMetric(overlay.googleAdsSeen)} ads đếm`;
    case "youtube":
      return `kho: ads ${formatMetric(overlay.youtubeAdsSeen)} · ${formatMetric(overlay.youtubeViews)} xem (không phải đơn)`;
    case "instagram":
    case "facebook":
      return `kho: ${overlay.fbActiveAds} ads · điểm ${overlay.fbHeat}`;
  }
}

function pageWindow(page: number, totalPages: number): number[] {
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  const out: number[] = [];
  for (let i = start; i <= end; i += 1) {
    out.push(i);
  }
  return out;
}

export function BestsellerPanel({
  page,
}: {
  page: PlatformBestsellerPage;
}) {
  const tab = page.tab;
  const label = platformTab(tab).labelVi;
  const href = (opts: { niche?: string; q?: string; trang?: number }) =>
    topHref(tab, { niche: opts.niche ?? (page.niche === "all" ? undefined : page.niche), q: opts.q ?? page.q, trang: opts.trang });
  return (
    <section className="platform-panel">
      <PlatformChips
        active={tab}
        base="top"
        niche={page.niche === "all" ? undefined : page.niche}
        extra={page.q ? { q: page.q } : undefined}
      />
      <div className="banner">
        Đây là <strong>{page.total} tên nghiên cứu</strong> hay gặp trên {label} — xếp theo ngành ưu tiên của kênh.
        <strong> Không</strong> phải bảng bán chạy / GMV toàn quốc. Radar không crawl Shopee, Lazada, Google hay
        YouTube. Số đã bán / ads chỉ hiện khi tiêu đề khớp mạnh với sản phẩm <strong>bạn đã lưu hoặc nhập</strong>.
        Tự động = tính lại kho, không phải crawler.
      </div>
      <form className="research-filters" action={topHref(tab)} method="get">
        {page.niche !== "all" ? <input type="hidden" name="niche" value={page.niche} /> : null}
        <label>
          Tìm tên
          <input type="search" name="q" defaultValue={page.q} placeholder="bỉm, serum, nồi chiên…" />
        </label>
        <div className="watch-actions">
          <button type="submit">Lọc catalog</button>
        </div>
      </form>
      <div className="filters">
        <Link href={topHref(tab, { q: page.q || undefined })} className={page.niche === "all" ? "on" : ""}>
          Tất cả ngành
        </Link>
        {LOCKED_NICHES.map((item) => (
          <Link
            key={item.slug}
            href={topHref(tab, { niche: item.slug, q: page.q || undefined })}
            className={page.niche === item.slug ? "on" : ""}
          >
            {item.nameVi}
          </Link>
        ))}
      </div>
      <p className="muted">
        Trang {page.page}/{page.totalPages} · {page.rows.length}/{page.total} tên · {page.warehouseMatchCount} khớp kho
        đã lưu · {label}
      </p>
      <table className="platform-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Tên nghiên cứu</th>
            <th>Ngành</th>
            <th>Trang chính thức</th>
            <th>Số kho (nếu khớp)</th>
          </tr>
        </thead>
        <tbody>
          {page.rows.map((row) => (
            <tr key={row.catalogId} className={row.overlay ? "" : "dim"}>
              <td>{row.rank}</td>
              <td>
                {row.overlay ? (
                  <Link href={`/san-pham/${row.overlay.clusterSlug}`}>{row.title}</Link>
                ) : (
                  row.title
                )}
              </td>
              <td>{row.nicheName}</td>
              <td>
                <a href={row.officialUrl} target="_blank" rel="noreferrer">
                  Mở {label}
                </a>
              </td>
              <td>{overlayLabel(tab, row.overlay)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="filters" aria-label="Phân trang">
        {page.page > 1 ? <Link href={href({ trang: 1 })}>Đầu</Link> : null}
        {page.page > 1 ? <Link href={href({ trang: page.page - 1 })}>Trước</Link> : null}
        {pageWindow(page.page, page.totalPages).map((n) => (
          <Link key={n} href={href({ trang: n })} className={n === page.page ? "on" : ""}>
            {n}
          </Link>
        ))}
        {page.page < page.totalPages ? <Link href={href({ trang: page.page + 1 })}>Sau</Link> : null}
        {page.page < page.totalPages ? <Link href={href({ trang: page.totalPages })}>Cuối</Link> : null}
      </div>
    </section>
  );
}
