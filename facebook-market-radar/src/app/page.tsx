import Link from "next/link";
import { LOCKED_NICHES } from "@/domain/niches";
import { getRadarService } from "@/server/radar";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ niche?: string; asOf?: string }> };

export default async function HomePage({ searchParams }: Props) {
  const params = await searchParams;
  const asOf = params.asOf ? Date.parse(params.asOf) : Date.now();
  const nowMs = Number.isFinite(asOf) ? asOf : Date.now();
  const service = getRadarService();
  const rankings = await service.listRankings(nowMs, params.niche);
  const ads = await service.listAds();
  const alerts = await service.listAlerts();

  return (
    <>
      <h1>Bảng xếp hạng ngách</h1>
      <p className="muted">
        HeatScore là ước lượng từ cường độ ads, độ bền, velocity và proxy Shopee/TikTok — không phải doanh số Facebook.
      </p>
      <div className="banner">
        Không có ROAS / CPA / đơn hàng của đối thủ. Số “sales proxy” chỉ xuất hiện khi bạn tự nhập sold công khai ngoài Facebook.
      </div>
      <div className="cards">
        <div className="card">
          <div className="n">{ads.length}</div>
          <div className="muted">Ads đã lưu</div>
        </div>
        <div className="card">
          <div className="n">{rankings.length}</div>
          <div className="muted">Cụm sản phẩm</div>
        </div>
        <div className="card">
          <div className="n">{alerts.length}</div>
          <div className="muted">Cảnh báo</div>
        </div>
      </div>
      <div className="filters">
        <Link href="/" className={!params.niche ? "on" : ""}>
          Tất cả
        </Link>
        {LOCKED_NICHES.map((n) => (
          <Link key={n.slug} href={`/?niche=${n.slug}`} className={params.niche === n.slug ? "on" : ""}>
            {n.nameVi}
          </Link>
        ))}
      </div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Cụm</th>
            <th>Ngách</th>
            <th>Ads / page</th>
            <th>Intensity</th>
            <th>Longevity</th>
            <th>Velocity</th>
            <th>Sales proxy</th>
            <th>Heat</th>
          </tr>
        </thead>
        <tbody>
          {rankings.map((row, i) => (
            <tr key={row.clusterSlug}>
              <td>{i + 1}</td>
              <td>{row.clusterTitle}</td>
              <td>{row.nicheName}</td>
              <td>
                {row.activeAdCount} / {row.distinctPageCount}
              </td>
              <td>{row.scores.intensity}</td>
              <td>{row.scores.longevity}</td>
              <td>{row.scores.velocity}</td>
              <td>{row.scores.salesProxy}</td>
              <td>
                <span className="badge">{row.scores.heat} ước lượng</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rankings.length === 0 ? (
        <p className="muted">
          Chưa có snapshot. <Link href="/collect">Lưu ads từ Ad Library</Link> hoặc chạy <code>pnpm db:seed</code>.
        </p>
      ) : null}
    </>
  );
}
