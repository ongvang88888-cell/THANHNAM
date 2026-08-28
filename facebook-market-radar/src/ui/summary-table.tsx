import Link from "next/link";
import { LANDING_KIND_VI, type LandingKind } from "@/domain/landing";
import type { SummaryRowSnapshot } from "@/domain/summary-table";
import type { ChannelSort } from "@/domain/sales-channels";
import { ProductCell } from "@/ui/product-cell";

function metric(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "—";
  }
  return value.toLocaleString("vi-VN");
}

function landingLabel(kinds: readonly string[]): string {
  const labels = kinds
    .map((kind) => (kind in LANDING_KIND_VI ? LANDING_KIND_VI[kind as LandingKind] : null))
    .filter((label): label is string => Boolean(label));
  return labels.join(", ") || "—";
}

export function summaryHref(sort: ChannelSort, niche?: string, ten?: string): string {
  const params = new URLSearchParams();
  if (sort !== "tong") {
    params.set("xep", sort);
  }
  if (niche) {
    params.set("niche", niche);
  }
  if (ten && ten.trim().length >= 2) {
    params.set("ten", ten.trim());
  }
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

export function SummaryTable({
  rows,
  sort,
  ten,
}: {
  rows: readonly SummaryRowSnapshot[];
  sort: ChannelSort;
  ten?: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="muted">
        Chưa có sản phẩm trong kho. <Link href="/collect">Lưu thẻ Facebook rồi nhập đã bán / ads đếm tay</Link>{" "}
        — Radar không kéo Google hay sàn.
      </p>
    );
  }
  return (
    <div className="table-scroll">
      <table className="channel-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Sản phẩm</th>
            <th>Ngành</th>
            <th>FB ads / trang</th>
            <th>Ngày chạy</th>
            <th>Nóng FB</th>
            <th>Shopee</th>
            <th>TikTok</th>
            <th>Lazada</th>
            <th>Tiki</th>
            <th>Sendo</th>
            <th>Tổng đã bán</th>
            <th>Ads Google</th>
            <th>Ads YT</th>
            <th>Ads TT</th>
            <th>Xem YT</th>
            <th>Landing</th>
            <th>Đẩy ads</th>
            <th>Đẩy bán</th>
            <th>Tổng hợp</th>
            <th>Mở kênh</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.clusterSlug}>
              <td>{index + 1}</td>
              <td>
                <ProductCell
                  title={row.clusterTitle}
                  imageUrls={row.imageUrls}
                  href={`/san-pham/${row.clusterSlug}`}
                />
                <div className="muted">{row.priceLabel}</div>
              </td>
              <td>
                <Link href={summaryHref(sort, row.nicheSlug, ten)}>{row.nicheName}</Link>
              </td>
              <td>
                {row.fbActiveAds} / {row.fbPages}
              </td>
              <td>{row.fbDaysRunning}</td>
              <td>
                <span className="badge warn">{row.fbHeat} ước lượng</span>
              </td>
              <td>{metric(row.sold.shopee)}</td>
              <td>{metric(row.sold.tiktok)}</td>
              <td>{metric(row.sold.lazada)}</td>
              <td>{metric(row.sold.tiki)}</td>
              <td>{metric(row.sold.sendo)}</td>
              <td>{row.soldTotal > 0 ? metric(row.soldTotal) : "—"}</td>
              <td>{metric(row.googleAdsSeen)}</td>
              <td>{metric(row.youtubeAdsSeen)}</td>
              <td>{metric(row.tiktokAdsSeen)}</td>
              <td>{metric(row.youtubeViews)}</td>
              <td>{landingLabel(row.landingKinds)}</td>
              <td>{row.adPush}</td>
              <td>{row.soldPush}</td>
              <td>
                <span className="badge warn">{row.composite} ước lượng</span>
              </td>
              <td>
                <div className="channel-links">
                  <a href={row.links.metaAdLibrary} target="_blank" rel="noreferrer">
                    Meta
                  </a>
                  <a href={row.links.googleAds} target="_blank" rel="noreferrer">
                    Google
                  </a>
                  <a href={row.links.youtube} target="_blank" rel="noreferrer">
                    YouTube
                  </a>
                  <a href={row.links.shopee} target="_blank" rel="noreferrer">
                    Shopee
                  </a>
                  <a href={row.links.lazada} target="_blank" rel="noreferrer">
                    Lazada
                  </a>
                  <a href={row.links.tiki} target="_blank" rel="noreferrer">
                    Tiki
                  </a>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
