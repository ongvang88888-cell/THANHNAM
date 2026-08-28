import Link from "next/link";
import { LOCKED_NICHES, NICHE_GROUPS, nicheGroup, nichesInGroup } from "@/domain/niches";
import { adRunSummary } from "@/domain/product-watch";
import { ProductCell } from "@/ui/product-cell";
import { getRadarService } from "@/server/radar";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ niche?: string; group?: string; asOf?: string }> };

export default async function HomePage({ searchParams }: Props) {
  const params = await searchParams;
  const asOf = params.asOf ? Date.parse(params.asOf) : Date.now();
  const nowMs = Number.isFinite(asOf) ? asOf : Date.now();
  const service = getRadarService();
  const allRankings = await service.listRankings(nowMs, params.niche);
  const rankings = params.group
    ? allRankings.filter((row) => nicheGroup(row.nicheSlug) === params.group)
    : allRankings;
  const ads = await service.listAds();
  const alerts = await service.listAlerts();
  const { industries, coverage } = await service.industryOverview(nowMs);
  const plan = await service.scanPlan(nowMs);
  const hot = industries.filter((row) => row.isHot).slice(0, 8);
  const visibleNiches = params.group ? nichesInGroup(params.group) : LOCKED_NICHES;

  return (
    <>
      <h1>Xếp hạng sản phẩm đang chạy quảng cáo</h1>
      <p className="muted">
        Điểm nóng là ước lượng từ cường độ quảng cáo, độ bền, tốc độ mới và proxy Shopee/TikTok — không
        phải doanh số Facebook.
      </p>
      <div className="banner">
        Không có tỷ suất / chi phí / đơn hàng của đối thủ. Số “proxy bán” chỉ xuất hiện khi bạn tự nhập
        số đã bán công khai ngoài Facebook. Giá cạnh tên là ước lượng (bạn nhập / nội dung ads / khoảng
        ngành) — không crawl sàn.
      </div>
      <form className="watch-search" action="/theo-doi" method="get">
        <label>
          Gõ tên sản phẩm — xem đang chạy bao nhiêu bài ads
          <input name="ten" placeholder="Serum Niacinamide, Bỉm quần, Đèn LED…" />
        </label>
        <button type="submit">Soi ads</button>
      </form>
      <div className="cards">
        <div className="card">
          <div className="n">{ads.length}</div>
          <div className="muted">Quảng cáo đã lưu</div>
        </div>
        <div className="card">
          <div className="n">{rankings.length}</div>
          <div className="muted">Sản phẩm đang theo</div>
        </div>
        <div className="card">
          <div className="n">
            {coverage.nichesWithData}/{coverage.totalNiches}
          </div>
          <div className="muted">Độ phủ ngành ({coverage.coveragePercent}%)</div>
        </div>
        <div className="card">
          <div className="n">{coverage.hotIndustryCount}</div>
          <div className="muted">Ngành đang chạy mạnh</div>
        </div>
        <div className="card">
          <div className="n">{coverage.strongProductCount}</div>
          <div className="muted">Sản phẩm mạnh</div>
        </div>
        <div className="card">
          <div className="n">{alerts.length}</div>
          <div className="muted">Cảnh báo</div>
        </div>
        <div className="card">
          <div className="n">{plan.uncoveredCount}</div>
          <div className="muted">
            <Link href="/quet">Cành chưa có mẫu</Link>
          </div>
        </div>
      </div>

      <h2>Ngành đang chạy mạnh</h2>
      <p className="muted">
        Ngành có ít nhất một sản phẩm điểm nóng ≥ 40 hoặc quảng cáo bền (≥ 50 độ bền và ≥ 2 quảng cáo
        đang chạy).{" "}
        <Link href="/nganh">Xem đủ {coverage.totalNiches} ngành</Link>.
      </p>
      {hot.length === 0 ? (
        <p className="muted">Chưa đủ dữ liệu để đánh dấu ngành nóng.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Ngành hàng</th>
              <th>Nhóm</th>
              <th>Quảng cáo</th>
              <th>Sản phẩm mạnh</th>
              <th>Điểm nóng cao nhất</th>
              <th>Tỷ trọng QC</th>
            </tr>
          </thead>
          <tbody>
            {hot.map((row) => (
              <tr key={row.nicheSlug}>
                <td>
                  <Link href={`/?niche=${row.nicheSlug}`}>{row.nicheName}</Link>
                </td>
                <td>{row.group}</td>
                <td>{row.activeAdCount}</td>
                <td>{row.strongProductCount}</td>
                <td>
                  <span className="badge">{row.maxHeat} ước lượng</span>
                </td>
                <td>{row.shareOfAds}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Lọc theo nhóm / ngành</h2>
      <div className="filters">
        <Link href="/" className={!params.group && !params.niche ? "on" : ""}>
          Tất cả nhóm
        </Link>
        {NICHE_GROUPS.map((group) => (
          <Link key={group} href={`/?group=${encodeURIComponent(group)}`} className={params.group === group ? "on" : ""}>
            {group}
          </Link>
        ))}
      </div>
      <div className="filters">
        <Link href={params.group ? `/?group=${encodeURIComponent(params.group)}` : "/"} className={!params.niche ? "on" : ""}>
          Tất cả ngành
        </Link>
        {visibleNiches.map((n) => (
          <Link
            key={n.slug}
            href={`/?niche=${n.slug}${params.group ? `&group=${encodeURIComponent(params.group)}` : ""}`}
            className={params.niche === n.slug ? "on" : ""}
          >
            {n.nameVi}
          </Link>
        ))}
      </div>

      <table className="rankings">
        <thead>
          <tr>
            <th>#</th>
            <th>Sản phẩm</th>
            <th>Ngành hàng</th>
            <th>Số QC / Số trang</th>
            <th>Cường độ</th>
            <th>Độ bền</th>
            <th>Tốc độ mới</th>
            <th>Proxy bán</th>
            <th>Điểm nóng</th>
          </tr>
        </thead>
        <tbody>
          {rankings.map((row, i) => (
            <tr key={row.clusterSlug}>
              <td>{i + 1}</td>
              <td>
                <ProductCell
                  title={row.clusterTitle}
                  imageUrls={row.imageUrls}
                  price={row.price}
                  adSummary={adRunSummary(row.activeAdCount, row.distinctPageCount, row.totalAdCount)}
                />
              </td>
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
          Chưa có dữ liệu. <Link href="/quet">Mở hàng đợi quét cành</Link>,{" "}
          <Link href="/collect">lưu quảng cáo từ Thư viện</Link> hoặc chạy <code>pnpm db:seed</code>.
        </p>
      ) : null}
    </>
  );
}
