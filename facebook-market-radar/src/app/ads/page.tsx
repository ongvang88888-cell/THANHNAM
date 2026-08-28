import Link from "next/link";
import { buildLibraryCards, sortLibraryCards } from "@/domain/ad-library-cards";
import { LibraryChrome } from "@/ui/library-chrome";
import { PageHead } from "@/ui/page-head";
import { SpyGrid } from "@/ui/spy-grid";
import { StatStrip } from "@/ui/stat-strip";
import { getRadarService } from "@/server/radar";

export const dynamic = "force-dynamic";

export default async function AdsPage() {
  const nowMs = Date.now();
  const service = getRadarService();
  const [ads, clusters, pages, research, boards, tags] = await Promise.all([
    service.listAds(),
    service.listClusters(),
    service.listPages(),
    service.listResearch(nowMs),
    service.listBoards(),
    service.listAdTags(),
  ]);
  const cards = sortLibraryCards(buildLibraryCards(ads, clusters, pages, research, nowMs), "heat");
  const tagsById = new Map<string, string[]>();
  for (const tag of tags) {
    tagsById.set(tag.libraryId, [...(tagsById.get(tag.libraryId) ?? []), tag.tag]);
  }
  const active = cards.filter((card) => card.isActive).length;
  return (
    <>
      <LibraryChrome query={{}} action="/ads" defaultPlatform="facebook" />
      <PageHead
        eyebrow="Kho thẻ"
        title="Ads đã lưu"
        lede="Từng thẻ bạn Collect — không phải kho ads toàn Facebook. See Ad mở Thư viện chính thức."
        actions={[
          { href: "/", label: "Tổng hợp" },
          { href: "/collect", label: "Lưu ads", primary: true },
        ]}
      />
      <StatStrip
        items={[
          { value: String(ads.length), label: "Thẻ đã lưu", href: "/ads" },
          { value: String(active), label: "Đang chạy (ước lượng)" },
          { value: String(research.length), label: "Sản phẩm", href: "/" },
          { value: String(boards.length), label: "Bộ sưu tập", href: "/bo-suu-tap" },
        ]}
      />
      {cards.length === 0 ? (
        <p className="muted">
          Chưa có thẻ. <Link href="/collect">Save Ad</Link>
        </p>
      ) : (
        <SpyGrid cards={cards} boards={boards} tagsById={tagsById} />
      )}
    </>
  );
}
