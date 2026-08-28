import Link from "next/link";
import { notFound } from "next/navigation";
import { isPlatformTabId, parsePlatformTab, platformTab } from "@/domain/platform-dashboards";
import { BestsellerPanel } from "@/ui/bestseller-panel";
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
      <h1>999 sản phẩm nghiên cứu trên {label}</h1>
      <p className="muted">
        Catalog sâu theo 26 ngành — cùng 999 tên trên mọi kênh, chỉ đổi thứ tự ưu tiên. Bấm link để mở trang
        tìm kiếm chính thức; tự đọc số rồi <Link href="/collect">nhập vào kho</Link> nếu muốn thấy cột số.
      </p>
      <BestsellerPanel page={page} />
      <p className="muted">
        <Link href={`/kenh/${tab}`}>Thống kê kho {label}</Link> · <Link href="/">Trang chủ</Link> ·{" "}
        <Link href="/tong-hop">Bảng đủ cột</Link> · <Link href="/quet">Quét cành Ads</Link>
      </p>
    </>
  );
}
