import Link from "next/link";
import { MEGA_SCAN_CAP } from "@/domain/mega-scan";
import { LOCKED_NICHES, NICHE_GROUPS, nicheGroup, nichesInGroup } from "@/domain/niches";
import { adRunSummary } from "@/domain/product-watch";
import { parseSavedFilter } from "@/domain/saved-research";
import { buildLibraryCards, parseLibrarySort, sortLibraryCards } from "@/domain/ad-library-cards";
import { ProductCell } from "@/ui/product-cell";
import { ResearchFilters } from "@/ui/research-filters";
import { ResearchGrid } from "@/ui/research-grid";
import { LibraryChrome } from "@/ui/library-chrome";
import { SpyGrid } from "@/ui/spy-grid";
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
    sort?: string;
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
  const view = params.view === "table" ? "table" : params.view === "grid" ? "grid" : "ads";
  const query = queryFromParams({ ...params, view });
  const filter = parseSavedFilter(params);
  const sort = parseLibrarySort(params.sort);
  const service = getRadarService();
  const [allRankings, research, ads, clusters, pages, boards, tags, alerts, overview, plan] = await Promise.all([
    service.listRankings(nowMs, params.niche),
    service.listResearch(nowMs, filter),
    service.listAds(),
    service.listClusters(),
    service.listPages(),
    service.listBoards(),
    service.listAdTags(),
    service.listAlerts(),
    service.industryOverview(nowMs),
    service.scanPlan(nowMs),
  ]);
  const scoped = params.group
    ? allRankings.filter((row) => nicheGroup(row.nicheSlug) === params.group)
    : allRankings;
  const { industries, coverage } = overview;
  const hot = industries.filter((row) => row.isHot).slice(0, 8);
  const visibleNiches = params.group ? nichesInGroup(params.group) : LOCKED_NICHES;
  const cards = sortLibraryCards(buildLibraryCards(ads, clusters, pages, research, nowMs), sort);
  const tagsById = new Map<string, string[]>();
  for (const tag of tags) {
    tagsById.set(tag.libraryId, [...(tagsById.get(tag.libraryId) ?? []), tag.tag]);
  }

  return (
    <>
      <LibraryChrome query={query} />
      <div className="page-head">
        <div>
          <p className="eyebrow">Ad Library</p>
          <h1>Saved Facebook ads</h1>
        </div>
        <div className="actions">
          <Link className="btn secondary" href={ten ? `/quet?ten=${encodeURIComponent(ten)}` : "/quet"}>
            Scan
          </Link>
          <Link className="btn" href="/collect">
            Collect
          </Link>
        </div>
      </div>
      <p className="lede">
        Giao diện học Ad Library (layout kiểu spy-tool). Bảng chỉ ads <strong>đã lưu</strong> — Radar không kéo
        Facebook. Điểm nóng là <strong>ước lượng</strong>. Không hiện like / share / impression giả, không có
        ROAS đối thủ.
      </p>
      <div className="banner">
        {ads.length} thẻ đã lưu · {scoped.length} sản phẩm đang theo. Không phải tổng ads Việt Nam trên Facebook.
        Mở rộng bằng ~{MEGA_SCAN_CAP.toLocaleString("vi-VN")} ô tìm trên <Link href="/quet">Ad Search</Link>, rồi
        Collect. Sort dùng Heat / ngày chạy / mới thấy — không phải độ tương đồng ảnh hay lượt thích.
      </div>

      <ResearchFilters action="/" query={query} />

      <div className="filters spy-views" role="tablist" aria-label="Library view">
        <Link href={researchHref("/", query, { view: "ads" })} className={view === "ads" ? "on" : ""} role="tab" aria-selected={view === "ads"}>
          Ads
        </Link>
        <Link href={researchHref("/", query, { view: "grid" })} className={view === "grid" ? "on" : ""} role="tab" aria-selected={view === "grid"}>
          Creatives
        </Link>
        <Link href={researchHref("/", query, { view: "table" })} className={view === "table" ? "on" : ""} role="tab" aria-selected={view === "table"}>
          Rankings
        </Link>
        <Link href="/xu-huong">Trending</Link>
        <Link href="/bo-suu-tap">Collection</Link>
      </div>
      <p className="muted">
        Ads = từng thẻ đã lưu · Creatives = nhóm creative · Rankings = điểm nóng ước lượng
      </p>

      <div className="cards">
        <div className="card">
          <div className="n">{scoped.length}</div>
          <div className="muted">Sản phẩm đang theo</div>
        </div>
        <div className="card">
          <div className="n">{cards.length}</div>
          <div className="muted">Ads in view</div>
        </div>
        <div className="card">
          <div className="n">{research.length}</div>
          <div className="muted">Creatives</div>
        </div>
        <div className="card">
          <div className="n">{pages.length}</div>
          <div className="muted">Pages</div>
        </div>
        <div className="card">
          <div className="n">
            {coverage.nichesWithData}/{coverage.totalNiches}
          </div>
          <div className="muted">Độ phủ ngành ({coverage.coveragePercent}%)</div>
        </div>
        <div className="card">
          <div className="n">{alerts.length}</div>
          <div className="muted">Alerts</div>
        </div>
        <div className="card">
          <div className="n">{plan.uncoveredCount}</div>
          <div className="muted">
            <Link href="/quet">Cành chưa có mẫu</Link>
          </div>
        </div>
      </div>

      {ten.length >= 2 ? (
        <p className="muted">
          Keyword “{ten}”: {research.length}/{scoped.length} sản phẩm đã lưu · {cards.length} thẻ. Muốn thêm bài
          đang chạy trên Facebook, mở <Link href={`/quet?ten=${encodeURIComponent(ten)}`}>hàng đợi Thư viện</Link>{" "}
          — Radar không tự kéo ads.
        </p>
      ) : null}

      {hot.length > 0 ? (
        <div className="filters">
          <span className="muted">Hot industries:</span>
          {hot.map((row) => (
            <Link key={row.nicheSlug} href={researchHref("/", query, { niche: row.nicheSlug })}>
              {row.nicheName}
            </Link>
          ))}
          <Link href="/nganh">All rankings</Link>
        </div>
      ) : null}

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

      {view === "ads" ? (
        cards.length === 0 ? (
          <p className="muted">
            {ten.length >= 2
              ? "Không khớp thẻ đã lưu với bộ lọc này."
              : "Chưa có thẻ. Mở Scan → Facebook Ad Library → Collect."}{" "}
            <Link href={ten ? `/quet?ten=${encodeURIComponent(ten)}` : "/quet"}>Ad Search</Link> ·{" "}
            <Link href="/collect">Save Ad</Link>
          </p>
        ) : (
          <SpyGrid cards={cards} boards={boards} tagsById={tagsById} />
        )
      ) : null}

      {view === "grid" ? (
        research.length === 0 ? (
          <p className="muted">
            Chưa có creative khớp. <Link href="/collect">Save Ad</Link>
          </p>
        ) : (
          <ResearchGrid rows={research} />
        )
      ) : null}

      {view === "table" ? (
        <>
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
          {research.length === 0 ? (
            <p className="muted">
              {ten.length >= 2 ? "Không khớp sản phẩm đã lưu với bộ lọc này." : "Chưa có dữ liệu."}{" "}
              <Link href={ten ? `/quet?ten=${encodeURIComponent(ten)}` : "/quet"}>Mở hàng đợi ô tìm</Link>,{" "}
              <Link href="/collect">lưu quảng cáo từ Thư viện</Link> hoặc chạy <code>pnpm db:seed</code>.
            </p>
          ) : null}
        </>
      ) : null}
    </>
  );
}
