import { getRadarService } from "@/server/radar";
import { PageWatchPanel } from "./page-watch-panel";
import { WatchPanel } from "./watch-panel";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ ten?: string }> };

export default async function WatchPage({ searchParams }: Props) {
  const { ten } = await searchParams;
  const query = ten?.trim() ?? "";
  const service = getRadarService();
  const lookup = query.length >= 2 ? await service.lookupScan(query) : null;
  const watches = await service.listWatchesWithAnalysis();
  const pageWatches = await service.listPageWatches();
  return (
    <>
      <h1>Theo dõi sản phẩm — soi ads đang chạy</h1>
      <p className="muted">
        Ghi tên sản phẩm hoặc từ khóa trong nội dung ads, đối chiếu dữ liệu đã lưu, rồi mở Thư viện để
        bắt thêm bài đang chạy. Không phải số chạy ads toàn thị trường Facebook.
      </p>
      <div className="banner">
        Giá cạnh tên là ước lượng: giá bạn nhập khi lưu thẻ, số VND đọc từ nội dung ads, và khoảng giá
        phổ biến cùng loại trên sàn VN. Không crawl Shopee/TikTok/Facebook.
      </div>
      <WatchPanel
        initialQuery={query}
        initialAnalysis={lookup?.analysis ?? null}
        initialVariants={lookup?.variants ?? []}
        initialWatches={watches}
      />
      <PageWatchPanel initialWatches={pageWatches} />
    </>
  );
}
