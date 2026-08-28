import Link from "next/link";
import { notFound } from "next/navigation";
import { LOCKED_NICHES } from "@/domain/niches";
import { isPlatformTabId, platformHref, parsePlatformTab } from "@/domain/platform-dashboards";
import { PlatformPanel } from "@/ui/platform-panel";
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

  return (
    <>
      <h1>Thống kê {dashboard.tab.labelVi}</h1>
      <p className="muted">
        Bảng chi tiết từng nền tảng / sàn trên <strong>kho đã lưu</strong>. Radar tính lại mỗi lần mở trang và
        mỗi 30 giây — không tự kéo Shopee, Lazada, Google hay YouTube.
      </p>
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
      <PlatformPanel dashboard={dashboard} base="kenh" niche={niche} />
      <p className="muted">
        <Link href={`/top/${tab}`}>999 tên nghiên cứu {dashboard.tab.labelVi}</Link> ·{" "}
        <Link href="/">Về trang chủ</Link> · <Link href="/tong-hop">Bảng đủ cột</Link> ·{" "}
        <Link href="/collect">Nhập đã bán / ads đếm tay</Link>
      </p>
    </>
  );
}
