import Link from "next/link";
import { adRunSummary } from "@/domain/product-watch";
import type { ProductDossier } from "@/domain/saved-research";
import { ProductCell } from "@/ui/product-cell";
import { getRadarService } from "@/server/radar";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ a?: string; b?: string }> };

function DossierColumn({ dossier }: { dossier: ProductDossier }) {
  const { row } = dossier;
  return (
    <section className="card">
      <ProductCell
        title={row.clusterTitle}
        imageUrls={row.imageUrls}
        price={row.price}
        adSummary={adRunSummary(row.activeAdCount, row.distinctPageCount, row.totalAdCount)}
        href={`/san-pham/${row.clusterSlug}`}
      />
      <p>Điểm nóng: {row.scores.heat} ước lượng</p>
      <p>Ngày chạy: {row.daysRunning}</p>
      <p>Trang / thẻ: {row.distinctPageCount} / {dossier.ads.length}</p>
      <p>Làn: {row.lane}</p>
      <p>Landing: {row.landingKinds.join(", ") || "chưa có"}</p>
      <p>Góc: {row.angles.join(", ") || "—"}</p>
      <p>Hook: {row.hook || "—"}</p>
    </section>
  );
}

export default async function ComparePage({ searchParams }: Props) {
  const { a, b } = await searchParams;
  const rankings = await getRadarService().listRankings(Date.now());
  const compared = a && b ? await getRadarService().compareProducts(a, b, Date.now()) : { left: null, right: null };
  return (
    <>
      <p className="eyebrow">Compare</p>
      <h1>So sánh hai sản phẩm đã lưu</h1>
      <p className="muted">Chọn hai cụm từ dữ liệu bạn lưu — không phải A/B Facebook Ads Manager.</p>
      <form className="research-filters" action="/so-sanh" method="get">
        <label>
          Sản phẩm A
          <select name="a" defaultValue={a ?? ""}>
            <option value="">—</option>
            {rankings.map((row) => (
              <option key={row.clusterSlug} value={row.clusterSlug}>
                {row.clusterTitle}
              </option>
            ))}
          </select>
        </label>
        <label>
          Sản phẩm B
          <select name="b" defaultValue={b ?? ""}>
            <option value="">—</option>
            {rankings.map((row) => (
              <option key={`b-${row.clusterSlug}`} value={row.clusterSlug}>
                {row.clusterTitle}
              </option>
            ))}
          </select>
        </label>
        <button type="submit">So sánh</button>
      </form>
      {compared.left && compared.right ? (
        <div className="compare-grid">
          <DossierColumn dossier={compared.left} />
          <DossierColumn dossier={compared.right} />
        </div>
      ) : (
        <p className="muted">
          Chọn đủ hai sản phẩm. Xem hồ sơ đơn: <Link href="/">bảng xếp hạng</Link>.
        </p>
      )}
    </>
  );
}
