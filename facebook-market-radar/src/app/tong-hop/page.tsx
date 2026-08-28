import Link from "next/link";
import { LANDING_KIND_VI } from "@/domain/landing";
import { LOCKED_NICHES } from "@/domain/niches";
import {
  CHANNEL_FAMILY_VI,
  SALES_CHANNELS,
  parseChannelSort,
  type ChannelSort,
} from "@/domain/sales-channels";
import { ProductCell } from "@/ui/product-cell";
import { getRadarService } from "@/server/radar";
import { PageHead } from "@/ui/page-head";
import { ChannelObservationForm } from "./channel-form";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ niche?: string; xep?: string; asOf?: string; kenh?: string }>;
};

function metric(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "—";
  }
  return value.toLocaleString("vi-VN");
}

function hrefFor(sort: ChannelSort, niche?: string): string {
  const params = new URLSearchParams();
  if (sort !== "tong") {
    params.set("xep", sort);
  }
  if (niche) {
    params.set("niche", niche);
  }
  const query = params.toString();
  return query ? `/tong-hop?${query}` : "/tong-hop";
}

export default async function ChannelAnalysisPage({ searchParams }: Props) {
  const params = await searchParams;
  const asOf = params.asOf ? Date.parse(params.asOf) : Date.now();
  const nowMs = Number.isFinite(asOf) ? asOf : Date.now();
  const niche = params.niche?.trim() || undefined;
  const sort = parseChannelSort(params.xep);
  const service = getRadarService();
  const rows = await service.listChannelAnalysis(nowMs, sort, niche);
  const clusters = (await service.listClusters()).map((cluster) => ({
    slug: cluster.slug,
    title: cluster.title,
  }));
  const families = (["ad_transparency", "ecommerce", "search_demand", "own_account", "blocked"] as const).map(
    (family) => ({
      family,
      rows: SALES_CHANNELS.filter((row) => row.family === family),
    }),
  );

  return (
    <>
      <PageHead
        eyebrow="Đa kênh"
        title="Bảng tổng hợp"
        lede="Cộng ads Facebook đã lưu với số bạn đọc trên Google, YouTube, TikTok và sàn. Không có dump “bán chạy + chạy ads nhiều nhất Việt Nam”."
        actions={[
          { href: "/kenh/shopee", label: "Từng kênh" },
          { href: "/collect", label: "Nhập số", primary: true },
        ]}
      />

      <h2>Kênh nghiên cứu hợp pháp</h2>
      {families.map((group) => (
        <section key={group.family}>
          <h3>{CHANNEL_FAMILY_VI[group.family]}</h3>
          <table>
            <thead>
              <tr>
                <th>Kênh</th>
                <th>Cách đưa vào Radar</th>
                <th>Có</th>
                <th>Không có</th>
              </tr>
            </thead>
            <tbody>
              {group.rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.nameVi}</strong>
                    <div className="muted">{row.officialHost}</div>
                    <div className="muted">{row.notesVi}</div>
                    {row.ingest !== "blocked" && row.ingest !== "own_api" ? (
                      <p>
                        <a href={row.researchUrl("serum")} target="_blank" rel="noreferrer">
                          Mở trang chính thức
                        </a>
                      </p>
                    ) : null}
                  </td>
                  <td>
                    {row.ingest === "user_count"
                      ? "User đọc rồi nhập"
                      : row.ingest === "own_api"
                        ? "API tài khoản của bạn"
                        : row.ingest === "url_only"
                          ? "Chỉ URL — không ingest"
                          : "Cấm"}
                  </td>
                  <td>{row.metrics.join(", ") || "—"}</td>
                  <td>{row.missing.join(", ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}

      <h2>Ghi chỉ số vào sản phẩm đã lưu</h2>
      <p className="muted">
        Mở listing / Transparency / video, đọc số, rồi nhập. Cùng khóa collect. Chi tiết:{" "}
        <Link href="/collect">Lưu quảng cáo</Link> · <Link href="/nguon">Nguồn Facebook</Link>.
      </p>
      <ChannelObservationForm clusters={clusters} />

      <h2>Bảng phân tích ({rows.length})</h2>
      <div className="filters">
        <Link href={hrefFor("tong", niche)} className={sort === "tong" ? "on" : ""}>
          Tổng hợp
        </Link>
        <Link href={hrefFor("ads", niche)} className={sort === "ads" ? "on" : ""}>
          Chạy ads nhiều
        </Link>
        <Link href={hrefFor("sold", niche)} className={sort === "sold" ? "on" : ""}>
          Bán nhiều (proxy)
        </Link>
      </div>
      <div className="filters">
        <Link href={hrefFor(sort)} className={!niche ? "on" : ""}>
          Tất cả ngành
        </Link>
        {LOCKED_NICHES.map((item) => (
          <Link
            key={item.slug}
            href={hrefFor(sort, item.slug)}
            className={niche === item.slug ? "on" : ""}
          >
            {item.nameVi}
          </Link>
        ))}
      </div>
      <p className="muted">
        <Link href="/manh">Ads mạnh Facebook</Link> · <Link href="/">Xếp hạng điểm nóng</Link> ·{" "}
        <Link href="/quet">Mở Thư viện</Link>
      </p>

      {rows.length === 0 ? (
        <p className="muted">
          Chưa có sản phẩm trong kho{niche ? " ngành này" : ""}. Lưu thẻ Facebook rồi nhập đã bán / ads
          đếm tay — Radar không kéo Google hay sàn.
        </p>
      ) : (
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
                    <Link href={hrefFor(sort, row.nicheSlug)}>{row.nicheName}</Link>
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
                  <td>{row.landingKinds.map((kind) => LANDING_KIND_VI[kind]).join(", ") || "—"}</td>
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
      )}
    </>
  );
}
