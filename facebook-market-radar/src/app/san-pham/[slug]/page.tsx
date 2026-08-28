import Link from "next/link";
import { notFound } from "next/navigation";
import { CREATIVE_ANGLE_VI } from "@/domain/creative-angles";
import { LANDING_KIND_VI } from "@/domain/landing";
import { formatVnd } from "@/domain/price";
import { adRunSummary } from "@/domain/product-watch";
import { ProductCell } from "@/ui/product-cell";
import { getRadarService } from "@/server/radar";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export default async function ProductDossierPage({ params }: Props) {
  const { slug } = await params;
  const dossier = await getRadarService().getProductDossier(slug, Date.now());
  if (!dossier) {
    notFound();
  }
  const { row } = dossier;
  return (
    <>
      <p className="muted">
        <Link href="/">← Xếp hạng</Link> · <Link href={`/so-sanh?a=${row.clusterSlug}`}>So sánh</Link>
      </p>
      <h1>{row.clusterTitle}</h1>
      <div className="banner">
        Hồ sơ chỉ từ thẻ <strong>bạn đã lưu</strong>. Không phải tổng ads Facebook, không phải doanh số / ROAS
        đối thủ. Điểm nóng ước lượng.
      </div>
      <ProductCell
        title={row.clusterTitle}
        imageUrls={row.imageUrls}
        price={row.price}
        adSummary={adRunSummary(row.activeAdCount, row.distinctPageCount, row.totalAdCount)}
      />
      <div className="cards">
        <div className="card">
          <div className="n">{row.scores.heat}</div>
          <div className="muted">Điểm nóng ước lượng</div>
        </div>
        <div className="card">
          <div className="n">{row.daysRunning}</div>
          <div className="muted">Ngày chạy (thẻ active)</div>
        </div>
        <div className="card">
          <div className="n">{row.distinctPageCount}</div>
          <div className="muted">Số trang đã lưu</div>
        </div>
        <div className="card">
          <div className="n">{dossier.ads.length}</div>
          <div className="muted">Thẻ trong hồ sơ</div>
        </div>
      </div>
      <p>
        Làn: <strong>{row.lane === "trending" ? "Trending" : row.lane === "fresh" ? "Fresh" : "Khác"}</strong>
        {" · "}
        Hook: {row.hook || "—"}
      </p>
      <p>
        <a href={dossier.officialSearchUrl} target="_blank" rel="noreferrer">
          Mở tìm tên này trên Thư viện
        </a>
        {" — Radar không tự kéo."}
      </p>
      <h2>Trang đã lưu</h2>
      <ul>
        {dossier.pages.map((page) => (
          <li key={page.pageId}>
            {page.pageId} · {page.adCount} thẻ ·{" "}
            <a href={page.libraryUrl} target="_blank" rel="noreferrer">
              Thư viện trang
            </a>
          </li>
        ))}
      </ul>
      <h2>Landing / shop (bạn dán)</h2>
      {dossier.shops.length === 0 ? (
        <p className="muted">Chưa có URL đích trên thẻ đã lưu.</p>
      ) : (
        <ul>
          {dossier.shops.map((shop) => (
            <li key={shop}>
              <Link href={`/?shop=${encodeURIComponent(shop)}`}>{shop}</Link>
            </li>
          ))}
        </ul>
      )}
      {dossier.relatedSlugs.length > 0 ? (
        <>
          <h2>Cùng shop (dữ liệu đã lưu)</h2>
          <ul>
            {dossier.relatedSlugs.map((related) => (
              <li key={related}>
                <Link href={`/san-pham/${related}`}>{related}</Link>
                {" · "}
                <Link href={`/so-sanh?a=${row.clusterSlug}&b=${related}`}>so sánh</Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <h2>Thẻ đã lưu</h2>
      <table>
        <thead>
          <tr>
            <th>Mã</th>
            <th>Trang</th>
            <th>Bắt đầu</th>
            <th>Đích</th>
            <th>Góc</th>
            <th>Giá nhập</th>
            <th>Đang chạy</th>
          </tr>
        </thead>
        <tbody>
          {dossier.ads.map((ad) => (
            <tr key={ad.libraryId}>
              <td>{ad.libraryId}</td>
              <td>
                {ad.pageId}{" "}
                <a href={ad.pageLibraryUrl} target="_blank" rel="noreferrer">
                  Thư viện
                </a>
              </td>
              <td>{ad.startDate}</td>
              <td>
                {LANDING_KIND_VI[ad.landingKind]}
                {ad.shop ? ` · ${ad.shop}` : ""}
              </td>
              <td>{ad.angles.map((angle) => CREATIVE_ANGLE_VI[angle]).join(", ") || "—"}</td>
              <td>{ad.listingPriceVnd != null ? formatVnd(ad.listingPriceVnd) : "—"}</td>
              <td>{ad.isActive ? "có" : "không"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
