import Link from "next/link";
import { LOCKED_NICHES } from "@/domain/niches";
import { parseChannelSort, type ChannelSort } from "@/domain/sales-channels";
import { countOptionalMetricCells, filterSummaryRows, toSummaryRowSnapshot } from "@/domain/summary-table";
import { getRadarService } from "@/server/radar";
import { PageHead } from "@/ui/page-head";
import { StatStrip } from "@/ui/stat-strip";
import { SummaryAutoRefresh } from "@/ui/summary-auto-refresh";
import { SummaryRefreshButton } from "@/ui/summary-refresh-button";
import { SummaryTable, summaryHref } from "@/ui/summary-table";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    niche?: string;
    ten?: string;
    xep?: string;
    asOf?: string;
  }>;
};

function formatWhen(iso: string | null): string {
  if (!iso) {
    return "chưa ghi";
  }
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) {
    return "chưa ghi";
  }
  return new Date(ms).toLocaleString("vi-VN");
}

export default async function HomePage({ searchParams }: Props) {
  const params = await searchParams;
  const asOf = params.asOf ? Date.parse(params.asOf) : Date.now();
  const nowMs = Number.isFinite(asOf) ? asOf : Date.now();
  const ten = params.ten?.trim() ?? "";
  const niche = params.niche?.trim() || undefined;
  const sort: ChannelSort = parseChannelSort(params.xep);
  const service = getRadarService();
  const [analysis, status] = await Promise.all([
    service.listChannelAnalysis(nowMs, sort, niche),
    service.getSummaryStatus(nowMs),
  ]);
  const live = filterSummaryRows(analysis.map(toSummaryRowSnapshot), ten);
  const cells = countOptionalMetricCells(live);

  return (
    <>
      <PageHead
        eyebrow="Mọi nền tảng · một bảng"
        title="Bảng tổng hợp"
        lede="Facebook ads đã lưu + đã bán Shopee / Lazada / Tiki / Sendo / TikTok + ads Google / YouTube / TikTok đã đếm + lượt xem YouTube. Số lấy từ kho và API chính thức (nếu có khóa). Ô — là chưa nhập — không bịa dump đã bán toàn quốc."
        actions={[
          { href: "/collect", label: "Nhập số", primary: true },
          { href: "/kenh/shopee", label: "Từng kênh" },
        ]}
      />
      <div className="actions">
        <SummaryRefreshButton />
      </div>
      <SummaryAutoRefresh />
      <p className="banner">
        {live.length} sản phẩm · ô có số {cells.filledCells}/{cells.filledCells + cells.emptyCells} · chu kỳ 6
        giờ {status.apiRan ? "(đã gọi API chính thức)" : "(chưa có khóa API — chỉ ghi kho)"} · lần ghi{" "}
        {formatWhen(status.capturedAt)} · lần sau {formatWhen(status.nextDueAt)}. Không crawl, không ROAS đối
        thủ.
      </p>
      <StatStrip
        items={[
          { value: String(live.length), label: "Sản phẩm trên bảng", href: "/" },
          { value: String(cells.filledCells), label: "Ô đã có số", href: "/collect" },
          { value: String(cells.emptyCells), label: "Ô còn trống", href: "/kenh/tiki" },
          {
            value: status.due ? "Đến hạn" : "Trong 6 giờ",
            label: "Chu kỳ ghi bảng",
            href: "/nguon",
          },
        ]}
      />
      <div className="filters">
        <Link href={summaryHref("tong", niche, ten)} className={sort === "tong" ? "on" : ""}>
          Tổng hợp
        </Link>
        <Link href={summaryHref("ads", niche, ten)} className={sort === "ads" ? "on" : ""}>
          Chạy ads nhiều
        </Link>
        <Link href={summaryHref("sold", niche, ten)} className={sort === "sold" ? "on" : ""}>
          Bán nhiều (proxy)
        </Link>
      </div>
      <div className="filters">
        <Link href={summaryHref(sort, undefined, ten)} className={!niche ? "on" : ""}>
          Tất cả ngành
        </Link>
        {LOCKED_NICHES.map((item) => (
          <Link
            key={item.slug}
            href={summaryHref(sort, item.slug, ten)}
            className={niche === item.slug ? "on" : ""}
          >
            {item.nameVi}
          </Link>
        ))}
      </div>
      {ten.length >= 2 ? (
        <p className="muted">
          Lọc “{ten}”: {live.length} dòng.{" "}
          <Link href={summaryHref(sort, niche)}>Bỏ lọc tên</Link>
        </p>
      ) : null}
      <SummaryTable rows={live} sort={sort} ten={ten} />
    </>
  );
}
