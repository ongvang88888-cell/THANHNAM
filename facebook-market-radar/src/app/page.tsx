import Link from "next/link";
import { buildLibraryCards, parseLibrarySort, sortLibraryCards } from "@/domain/ad-library-cards";
import { MEGA_SCAN_CAP } from "@/domain/mega-scan";
import { nicheGroup } from "@/domain/niches";
import { parseSavedFilter } from "@/domain/saved-research";
import { adRunSummary } from "@/domain/product-watch";
import { TRENDING_DEFAULT_PLATFORM } from "@/domain/app-nav";
import { parsePlatformTab } from "@/domain/platform-dashboards";
import { ProductCell } from "@/ui/product-cell";
import { FilterDrawer } from "@/ui/filter-drawer";
import { LibraryChrome } from "@/ui/library-chrome";
import { PageHead } from "@/ui/page-head";
import { PlatformMatrix } from "@/ui/platform-matrix";
import { ResearchGrid } from "@/ui/research-grid";
import { hasActiveResearchQuery, queryFromParams, researchHref } from "@/ui/research-query";
import { SpyGrid } from "@/ui/spy-grid";
import { StatStrip } from "@/ui/stat-strip";
import { BestsellerPanel } from "@/ui/bestseller-panel";
import { WarehouseAutoRefresh } from "@/ui/warehouse-auto-refresh";
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
    sort?: string;
    kenh?: string;
  }>;
};

function parseHomeView(raw?: string): "ads" | "table" | "grid" | "999" {
  if (raw === "table" || raw === "grid" || raw === "999") {
    return raw;
  }
  return "ads";
}

export default async function HomePage({ searchParams }: Props) {
  const params = await searchParams;
  const asOf = params.asOf ? Date.parse(params.asOf) : Date.now();
  const nowMs = Number.isFinite(asOf) ? asOf : Date.now();
  const ten = params.ten?.trim() ?? "";
  const view = parseHomeView(params.view);
  const query = queryFromParams({ ...params, view });
  const filter = parseSavedFilter(params);
  const kenh = parsePlatformTab(params.kenh, TRENDING_DEFAULT_PLATFORM);
  const sort = parseLibrarySort(params.sort);
  const service = getRadarService();
  const needsAds = view === "ads";
  const needs999 = view === "999";

  const [allRankings, research, ads, alerts, overview, dashboard, boards, tags, clusters, pages, bestsellers] =
    await Promise.all([
      service.listRankings(nowMs, params.niche),
      service.listResearch(nowMs, filter),
      service.listAds(),
      service.listAlerts(),
      service.industryOverview(nowMs),
      service.listPlatformDashboard(nowMs, kenh, params.niche),
      needsAds ? service.listBoards() : Promise.resolve([]),
      needsAds ? service.listAdTags() : Promise.resolve([]),
      needsAds ? service.listClusters() : Promise.resolve([]),
      needsAds ? service.listPages() : Promise.resolve([]),
      needs999
        ? service.listPlatformBestsellers(nowMs, kenh, {
            niche: params.niche,
            q: ten || undefined,
            trang: 1,
          })
        : Promise.resolve(null),
    ]);

  const { coverage } = overview;
  const scoped = params.group
    ? allRankings.filter((row) => nicheGroup(row.nicheSlug) === params.group)
    : allRankings;
  const scopedSlugs = new Set(research.map((row) => row.clusterSlug));
  const filterOn = hasActiveResearchQuery(query);
  const cards = needsAds
    ? sortLibraryCards(buildLibraryCards(ads, clusters, pages, research, nowMs), sort).filter(
        (card) => !filterOn || scopedSlugs.has(card.clusterSlug),
      )
    : [];
  const tagsById = new Map<string, string[]>();
  for (const tag of tags) {
    tagsById.set(tag.libraryId, [...(tagsById.get(tag.libraryId) ?? []), tag.tag]);
  }

  return (
    <>
      <LibraryChrome query={query} action="/" />
      <PageHead
        eyebrow="Đa nền tảng · kho đã lưu"
        title="Thống kê ads & sàn"
        lede="Shopee, Lazada, Google, YouTube, TikTok, Facebook trên cùng một bảng. Số sàn / ads ngoài Facebook = bạn nhập. Điểm nóng Facebook luôn ước lượng."
      >
        <Link className="btn secondary" href={ten ? `/quet?ten=${encodeURIComponent(ten)}` : "/quet"}>
          Quét
        </Link>
        <Link className="btn" href="/collect">
          Nhập số
        </Link>
      </PageHead>
      <WarehouseAutoRefresh />
      <div className="banner">
        {scoped.length} sản phẩm · {ads.length} thẻ đã lưu — không phải tổng ads / GMV Việt Nam. ~{" "}
        {MEGA_SCAN_CAP.toLocaleString("vi-VN")} ô tìm Thư viện trên <Link href="/quet">Quét cành</Link>. Không
        crawl, không ROAS đối thủ.
      </div>
      <StatStrip
        items={[
          { value: String(scoped.length), label: "Sản phẩm đang theo", href: "/?view=table" },
          { value: String(ads.length), label: "Ads đã lưu", href: "/ads" },
          {
            value: `${coverage.nichesWithData}/${coverage.totalNiches}`,
            label: `Phủ ngành (${coverage.coveragePercent}%)`,
            href: "/nganh",
          },
          { value: String(alerts.length), label: "Cảnh báo", href: "/alerts" },
        ]}
      />
      <PlatformMatrix coverage={dashboard.coverage} active={kenh} />
      <FilterDrawer action="/" query={query} />
      <div className="filters spy-views" role="tablist" aria-label="Kiểu xem">
        <Link href={researchHref("/", query, { view: "ads" })} className={view === "ads" ? "on" : ""}>
          Ads
        </Link>
        <Link href={researchHref("/", query, { view: "table" })} className={view === "table" ? "on" : ""}>
          Bảng
        </Link>
        <Link href={researchHref("/", query, { view: "grid" })} className={view === "grid" ? "on" : ""}>
          Lưới
        </Link>
        <Link href={researchHref("/", query, { view: "999" })} className={view === "999" ? "on" : ""}>
          999 tên
        </Link>
        <Link href="/manh">Ads mạnh</Link>
        <Link href="/tong-hop">Tổng hợp</Link>
        <Link href={`/top/${kenh}`}>Đủ 999 / {kenh}</Link>
      </div>

      {ten.length >= 2 ? (
        <p className="muted">
          Lọc “{ten}”: {research.length}/{scoped.length} sản phẩm đã lưu.{" "}
          <Link href={`/quet?ten=${encodeURIComponent(ten)}`}>Mở hàng đợi Thư viện</Link> — Radar không tự kéo ads.
        </p>
      ) : null}

      {view === "ads" ? (
        cards.length === 0 ? (
          <p className="muted">
            Chưa có thẻ khớp. <Link href="/collect">Nhập số / lưu ads</Link> hoặc{" "}
            <Link href={ten ? `/quet?ten=${encodeURIComponent(ten)}` : "/quet"}>Quét cành</Link>.
          </p>
        ) : (
          <SpyGrid cards={cards} boards={boards} tagsById={tagsById} />
        )
      ) : null}

      {view === "grid" ? <ResearchGrid rows={research} /> : null}

      {view === "table" ? (
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
      ) : null}

      {view === "999" && bestsellers ? <BestsellerPanel page={bestsellers} /> : null}

      {(view === "table" || view === "grid") && research.length === 0 ? (
        <p className="muted">
          {ten.length >= 2 ? "Không khớp sản phẩm đã lưu với bộ lọc này." : "Chưa có dữ liệu."}{" "}
          <Link href={ten ? `/quet?ten=${encodeURIComponent(ten)}` : "/quet"}>Mở hàng đợi ~1.000.000 ô tìm</Link>,{" "}
          <Link href="/collect">lưu quảng cáo từ Thư viện</Link>.
        </p>
      ) : null}
    </>
  );
}
