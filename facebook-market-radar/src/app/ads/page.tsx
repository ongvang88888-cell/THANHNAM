import Link from "next/link";
import { buildLibraryCards, sortLibraryCards } from "@/domain/ad-library-cards";
import { LibraryChrome } from "@/ui/library-chrome";
import { SpyGrid } from "@/ui/spy-grid";
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
  return (
    <>
      <LibraryChrome query={{}} action="/ads" />
      <p className="eyebrow">Saved Ads</p>
      <h1>Quảng cáo đã lưu</h1>
      <p className="muted">
        {ads.length} bản ghi — nhập tay / dữ liệu mẫu / file đã mua.{" "}
        <Link href="/bo-suu-tap">Collection</Link> · <Link href="/">Ad Library</Link>
      </p>
      <div className="banner">
        Đây là thẻ bạn đã Collect — không phải kho ads toàn Facebook. See Ad mở Thư viện chính thức. Không có
        like / share / impression.
      </div>
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
