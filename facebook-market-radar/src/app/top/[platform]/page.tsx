import Link from "next/link";
import { notFound } from "next/navigation";
import { isPlatformTabId, parsePlatformTab, platformTab } from "@/domain/platform-dashboards";
import { BestsellerPanel } from "@/ui/bestseller-panel";
import { PageHead } from "@/ui/page-head";
import { getRadarService } from "@/server/radar";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ platform: string }>;
  searchParams: Promise<{ niche?: string; q?: string; ten?: string; trang?: string; asOf?: string }>;
};

export default async function PlatformBestsellerPage({ params, searchParams }: Props) {
  const { platform } = await params;
  if (!isPlatformTabId(platform)) {
    notFound();
  }
  const query = await searchParams;
  const asOf = query.asOf ? Date.parse(query.asOf) : Date.now();
  const nowMs = Number.isFinite(asOf) ? asOf : Date.now();
  const tab = parsePlatformTab(platform);
  const page = await getRadarService().listPlatformBestsellers(nowMs, tab, {
    niche: query.niche?.trim() || undefined,
    q: query.q?.trim() || query.ten?.trim() || undefined,
    trang: query.trang ? Number(query.trang) : 1,
  });
  const label = platformTab(tab).labelVi;

  return (
    <>
      <PageHead
        eyebrow="Catalog nghiên cứu"
        title={`999 tên trên ${label}`}
        lede="Cùng 999 tên trên mọi kênh, chỉ đổi thứ tự ưu tiên. Không phải GMV live. Bấm link trang chính thức, tự đọc số rồi nhập vào kho."
        actions={[
          { href: `/kenh/${tab}`, label: "Thống kê kho" },
          { href: "/collect", label: "Nhập số", primary: true },
        ]}
      />
      <BestsellerPanel page={page} />
      <p className="muted">
        <Link href={`/kenh/${tab}`}>Thống kê kho {label}</Link> · <Link href="/">Trang chủ</Link> ·{" "}
        <Link href="/">Bảng tổng hợp</Link> · <Link href="/quet">Quét cành Ads</Link>
      </p>
    </>
  );
}
