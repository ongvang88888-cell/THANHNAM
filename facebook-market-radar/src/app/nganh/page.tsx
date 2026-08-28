import Link from "next/link";
import { catalogScanQueryCount } from "@/domain/ad-library-scan";
import { NICHE_GROUPS } from "@/domain/niches";
import { groupIndustryStats } from "@/domain/industry-stats";
import { getRadarService } from "@/server/radar";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ asOf?: string }> };

export default async function IndustryPage({ searchParams }: Props) {
  const params = await searchParams;
  const asOf = params.asOf ? Date.parse(params.asOf) : Date.now();
  const nowMs = Number.isFinite(asOf) ? asOf : Date.now();
  const { industries, coverage } = await getRadarService().industryOverview(nowMs);
  const groupRank = new Map<string, number>(NICHE_GROUPS.map((group, index) => [group, index]));
  const grouped = groupIndustryStats(industries).sort(
    (a, b) => (groupRank.get(a.group) ?? 99) - (groupRank.get(b.group) ?? 99),
  );
  const hot = industries.filter((row) => row.isHot);

  return (
    <>
      <p className="eyebrow">Rankings</p>
      <h1>Ngành đang chạy mạnh</h1>
      <p className="muted">
        Thống kê đủ {coverage.totalNiches} ngành hàng trong danh mục. Điểm nóng luôn là ước lượng từ
        quảng cáo bạn đã lưu — không quét Facebook tự động.
      </p>
      <div className="banner">
        “Quét đầy đủ” = hàng đợi cành từ khóa trên <Link href="/quet">Quét cành</Link> để bạn tự mở
        Thư viện. Server không tải facebook.com.
      </div>
      <div className="cards">
        <div className="card">
          <div className="n">{coverage.hotIndustryCount}</div>
          <div className="muted">Ngành đang chạy mạnh</div>
        </div>
        <div className="card">
          <div className="n">{coverage.strongProductCount}</div>
          <div className="muted">
            <Link href="/manh">Sản phẩm ads mạnh nhất</Link>
            {" · "}
            <Link href="/tong-hop">Tổng hợp kênh</Link>
          </div>
        </div>
        <div className="card">
          <div className="n">{coverage.coveragePercent}%</div>
          <div className="muted">
            Độ phủ ({coverage.nichesWithData}/{coverage.totalNiches} ngành có dữ liệu)
          </div>
        </div>
        <div className="card">
          <div className="n">{coverage.emptyNiches}</div>
          <div className="muted">Ngành chưa có mẫu</div>
        </div>
        <div className="card">
          <div className="n">{catalogScanQueryCount()}</div>
          <div className="muted">
            <Link href="/quet">Cành từ khóa trên Thư viện</Link>
          </div>
        </div>
      </div>

      <h2>Bảng nóng tuần này</h2>
      {hot.length === 0 ? <p className="muted">Chưa có ngành đạt ngưỡng chạy mạnh.</p> : null}
      {hot.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>Ngành hàng</th>
              <th>Nhóm</th>
              <th>Sản phẩm</th>
              <th>Quảng cáo</th>
              <th>Trang</th>
              <th>Sản phẩm mạnh</th>
              <th>Điểm TB / cao nhất</th>
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
                <td>{row.clusterCount}</td>
                <td>{row.activeAdCount}</td>
                <td>{row.pageCount}</td>
                <td>{row.strongProductCount}</td>
                <td>
                  {row.avgHeat} / <span className="badge">{row.maxHeat}</span>
                </td>
                <td>{row.shareOfAds}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      {grouped.map(({ group, rows }) => (
        <section key={group}>
          <h2>{group}</h2>
          <table>
            <thead>
              <tr>
                <th>Ngành hàng</th>
                <th>Trạng thái</th>
                <th>Sản phẩm</th>
                <th>Quảng cáo</th>
                <th>Trang</th>
                <th>Sản phẩm mạnh</th>
                <th>Điểm nóng cao nhất</th>
                <th>Tỷ trọng QC</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.nicheSlug}>
                  <td>
                    <Link href={`/?niche=${row.nicheSlug}`}>{row.nicheName}</Link>
                  </td>
                  <td>
                    {row.isHot ? (
                      <span className="badge warn">Đang chạy mạnh</span>
                    ) : row.hasData ? (
                      <span className="badge">Có dữ liệu</span>
                    ) : (
                      <span className="muted">Chưa có mẫu</span>
                    )}
                  </td>
                  <td>{row.clusterCount}</td>
                  <td>{row.activeAdCount}</td>
                  <td>{row.pageCount}</td>
                  <td>{row.strongProductCount}</td>
                  <td>{row.maxHeat || "—"}</td>
                  <td>{row.shareOfAds}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </>
  );
}
