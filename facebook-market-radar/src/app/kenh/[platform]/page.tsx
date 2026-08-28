import Link from "next/link";
import { notFound } from "next/navigation";
import { LOCKED_NICHES } from "@/domain/niches";
import { isPlatformTabId, platformHref, parsePlatformTab } from "@/domain/platform-dashboards";
import { PageHead } from "@/ui/page-head";
import { PlatformPanel } from "@/ui/platform-panel";
import { StatStrip } from "@/ui/stat-strip";
import { formatMetric } from "@/ui/platform-metric";
import { getRadarService } from "@/server/radar";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ platform: string }>;
  searchParams: Promise<{ niche?: string; asOf?: string }>;
};

export default async function PlatformDashboardPage({ params, searchParams }: Props) {
  const { platform } = await params;
  if (!isPlatformTabId(platform)) {
    notFound();
  }
  const query = await searchParams;
  const asOf = query.asOf ? Date.parse(query.asOf) : Date.now();
  const nowMs = Number.isFinite(asOf) ? asOf : Date.now();
  const niche = query.niche?.trim() || undefined;
  const tab = parsePlatformTab(platform);
  const dashboard = await getRadarService().listPlatformDashboard(nowMs, tab, niche);
  const card = dashboard.coverage.find((item) => item.id === tab);

  return (
    <>
      <PageHead
        eyebrow="Thống kê kho"
        title={dashboard.tab.labelVi}
        lede="Chi tiết từng nền tảng trên kho đã lưu. Radar tính lại mỗi lần mở trang — không tự kéo Shopee, Google hay YouTube."
      >
        <Link className="btn secondary" href={`/top/${tab}`}>
          999 tên
        </Link>
        <Link className="btn" href="/collect">
          Nhập số
        </Link>
      </PageHead>
      <StatStrip
        items={[
          {
            value: `${dashboard.withDataCount}/${dashboard.ranked.length}`,
            label: `Có số ${dashboard.tab.labelVi}`,
          },
          {
            value: card ? `${card.coveragePercent}%` : "0%",
            label: "Phủ kho",
          },
          {
            value: card && formatMetric(card.metricSum) !== "—" ? formatMetric(card.metricSum) : "0",
            label: dashboard.tab.valueLabelVi,
          },
          { value: "999", label: "Tên nghiên cứu", href: `/top/${tab}` },
        ]}
      />
      <div className="filters">
        <Link href={platformHref(tab)} className={!niche ? "on" : ""}>
          Tất cả ngành
        </Link>
        {LOCKED_NICHES.map((item) => (
          <Link
            key={item.slug}
            href={platformHref(tab, { niche: item.slug })}
            className={niche === item.slug ? "on" : ""}
          >
            {item.nameVi}
          </Link>
        ))}
      </div>
      <PlatformPanel dashboard={dashboard} base="kenh" niche={niche} showCoverage={false} />
      <p className="muted">
        <Link href="/">Tổng quan</Link> · <Link href="/tong-hop">Bảng đủ cột</Link>
      </p>
    </>
  );
}
