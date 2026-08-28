import Link from "next/link";
import { MEGA_SCAN_CAP } from "@/domain/mega-scan";
import { LOCKED_NICHES, NICHE_GROUPS, nicheGroup, nichesInGroup } from "@/domain/niches";
import { adRunSummary } from "@/domain/product-watch";
import { parseSavedFilter } from "@/domain/saved-research";
import { ProductCell } from "@/ui/product-cell";
import { ResearchFilters } from "@/ui/research-filters";
import { ResearchGrid } from "@/ui/research-grid";
import { queryFromParams, researchHref } from "@/ui/research-query";
import { getRadarService } from "@/server/radar";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    niche?: string;
    group?: string;
    asOf?: string;
    ten?: string;
    view?: string;
    minDays?: string;
    minPages?: string;
    landing?: string;
    landingKind?: string;
    angle?: string;
    media?: string;
    minPrice?: string;
    maxPrice?: string;
    lane?: string;
    shop?: string;
  }>;
};

export default async function HomePage({ searchParams }: Props) {
  const params = await searchParams;
  const asOf = params.asOf ? Date.parse(params.asOf) : Date.now();
  const nowMs = Number.isFinite(asOf) ? asOf : Date.now();
  const ten = params.ten?.trim() ?? "";
  const view = params.view === "grid" ? "grid" : "table";
  const query = queryFromParams({ ...params, view });
  const filter = parseSavedFilter(params);
  const service = getRadarService();
  const allRankings = await service.listRankings(nowMs, params.niche);
  const scoped = params.group
    ? allRankings.filter((row) => nicheGroup(row.nicheSlug) === params.group)
    : allRankings;
  const research = await service.listResearch(nowMs, filter);
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
        Bảng dưới chỉ ads <strong>bạn đã lưu</strong> ({allRankings.length} sản phẩm) — không phải tổng sản phẩm
        chạy ads trên Facebook. Bộ lọc / lưới creative soi trên thẻ đã lưu (kiểu EachSpy / Kalodata), không
        crawl. Để mở rộng, dùng ~{MEGA_SCAN_CAP.toLocaleString("vi-VN")} ô tìm Thư viện trên{" "}
        <Link href="/quet">Quét cành</Link>. Không có ROAS / chi phí đối thủ.
      </div>
      <ResearchFilters action="/" query={query} />
      <div className="filters">
        <Link href={researchHref("/", query, { view: "table" })} className={view === "table" ? "on" : ""}>
          Bảng
        </Link>
        <Link href={researchHref("/", query, { view: "grid" })} className={view === "grid" ? "on" : ""}>
          Lưới creative
        </Link>
        <Link href="/xu-huong">Xu hướng / hook</Link>
        <Link href="/bo-suu-tap">Bộ sưu tập</Link>
      </div>
      <div className="cards">
        <div className="card">
          <div className="n">{ads.length}</div>
          <div className="muted">Quảng cáo đã lưu</div>
        </div>
        <div className="card">
          <div className="n">{scoped.length}</div>
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
        <div className="card">
          <div className="n">~{MEGA_SCAN_CAP.toLocaleString("vi-VN")}</div>
          <div className="muted">
            <Link href={ten ? `/quet?ten=${encodeURIComponent(ten)}` : "/quet"}>Ô tìm mở rộng</Link>
          </div>
        </div>
      </div>
      {ten.length >= 2 ? (
        <p className="muted">
          Lọc “{ten}”: {research.length}/{scoped.length} sản phẩm đã lưu. Muốn thêm bài đang chạy trên Facebook,
          mở <Link href={`/quet?ten=${encodeURIComponent(ten)}`}>hàng đợi Thư viện</Link> — Radar không tự kéo ads.
        </p>
      ) : null}

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
        <Link href={researchHref("/", { ...query, group: undefined, niche: undefined })} className={!params.group && !params.niche ? "on" : ""}>
          Tất cả nhóm
        </Link>
        {NICHE_GROUPS.map((group) => (
          <Link
            key={group}
            href={researchHref("/", query, { group, niche: undefined })}
            className={params.group === group ? "on" : ""}
          >
            {group}
          </Link>
        ))}
      </div>
      <div className="filters">
        <Link href={researchHref("/", { ...query, niche: undefined })} className={!params.niche ? "on" : ""}>
          Tất cả ngành
        </Link>
        {visibleNiches.map((n) => (
          <Link
            key={n.slug}
            href={researchHref("/", query, { niche: n.slug })}
            className={params.niche === n.slug ? "on" : ""}
          >
            {n.nameVi}
          </Link>
        ))}
      </div>

      {view === "grid" ? (
        <ResearchGrid rows={research} />
      ) : (
        <table className="rankings">
          <thead>
            <tr>
              <th>#</th>
              <th>Sản phẩm</th>
              <th>Ngành hàng</th>
              <th>Số QC / Số trang</th>
              <th>Ngày chạy</th>
              <th>Làn</th>
              <th>Cường độ</th>
              <th>Độ bền</th>
              <th>Tốc độ mới</th>
              <th>Proxy bán</th>
              <th>Điểm nóng</th>
            </tr>
          </thead>
          <tbody>
            {research.map((row, i) => (
              <tr key={row.clusterSlug}>
                <td>{i + 1}</td>
                <td>
                  <ProductCell
                    title={row.clusterTitle}
                    imageUrls={row.imageUrls}
                    price={row.price}
                    adSummary={adRunSummary(row.activeAdCount, row.distinctPageCount, row.totalAdCount)}
                    href={`/san-pham/${row.clusterSlug}`}
                  />
                </td>
                <td>{row.nicheName}</td>
                <td>
                  {row.activeAdCount} / {row.distinctPageCount}
                </td>
                <td>{row.daysRunning} ngày</td>
                <td>{row.lane === "trending" ? "Trending" : row.lane === "fresh" ? "Fresh" : "Khác"}</td>
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
      )}
      {research.length === 0 ? (
        <p className="muted">
          {ten.length >= 2
            ? "Không khớp sản phẩm đã lưu với bộ lọc này."
            : "Chưa có dữ liệu."}{" "}
          <Link href={ten ? `/quet?ten=${encodeURIComponent(ten)}` : "/quet"}>Mở hàng đợi ~1.000.000 ô tìm</Link>,{" "}
          <Link href="/collect">lưu quảng cáo từ Thư viện</Link> hoặc chạy <code>pnpm db:seed</code>.
        </p>
      ) : null}
    </>
  );
}
