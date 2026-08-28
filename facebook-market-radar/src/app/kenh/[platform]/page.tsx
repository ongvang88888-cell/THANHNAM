import Link from "next/link";
import { notFound } from "next/navigation";
import { landingKindForTab, isPlatformTabId, platformHref, parsePlatformTab } from "@/domain/platform-dashboards";
import { CollectQueue } from "@/ui/collect-queue";
import { FillPaths } from "@/ui/fill-paths";
import { NicheFilter } from "@/ui/niche-filter";
import { PageHead } from "@/ui/page-head";
import { PlatformPanel } from "@/ui/platform-panel";
import { StatStrip } from "@/ui/stat-strip";
import { PlatformStatsButton } from "@/ui/platform-stats-button";
import { YoutubeViewsButton } from "@/ui/youtube-views-button";
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
  const usesLanding = landingKindForTab(tab) !== null;
  const stats = [
    {
      value: `${dashboard.withDataCount}/${dashboard.ranked.length}`,
      label: `Có số ${dashboard.tab.labelVi}`,
    },
    ...(usesLanding
      ? [
          {
            value: `${dashboard.landingCount}/${dashboard.ranked.length}`,
            label: `Có đích ${dashboard.tab.labelVi}`,
          },
        ]
      : []),
    {
      value: card ? `${card.coveragePercent}%` : "0%",
      label: "Phủ số đã nhập",
    },
    {
      value: card && formatMetric(card.metricSum) !== "—" ? formatMetric(card.metricSum) : "0",
      label: dashboard.tab.valueLabelVi,
    },
    {
      value: String(dashboard.missingCount),
      label: "Thiếu số — hàng đợi",
    },
    { value: "999", label: "Tên nghiên cứu", href: `/top/${tab}` },
  ];

  return (
    <>
      <PageHead
        eyebrow="Thống kê kho"
        title={dashboard.tab.labelVi}
        lede="Số đã nhập ≠ đích đã lưu. Nút API gọi googleapis / Open Platform shop của bạn — không scrape HTML sàn. Ô 0% nghĩa là chưa nhập số hoặc chưa khóa API, không phải nền tảng biến mất."
        actions={[
          { href: `/top/${tab}`, label: "999 tên" },
          { href: "/nguon", label: "API nguồn" },
          { href: "/collect", label: "Sheet / feed", primary: true },
        ]}
      />
      <StatStrip items={stats} />
      <NicheFilter action={platformHref(tab)} niche={niche} />
      <PlatformStatsButton />
      {tab === "youtube" ? <YoutubeViewsButton videoCount={dashboard.youtubeVideoCount} /> : null}
      <FillPaths />
      <CollectQueue
        tabLabel={dashboard.tab.labelVi}
        items={dashboard.queue}
        source={dashboard.metricSource}
      />
      <PlatformPanel dashboard={dashboard} base="kenh" niche={niche} showCoverage={false} />
      <p className="muted">
        <Link href="/">Tổng quan</Link> · <Link href="/tong-hop">Bảng đủ cột</Link> ·{" "}
        <Link href="/nguon">Mọi nguồn hợp pháp</Link>
      </p>
    </>
  );
}
