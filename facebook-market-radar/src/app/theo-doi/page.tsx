import { getRadarService } from "@/server/radar";
import { WatchPanel } from "./watch-panel";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ ten?: string }> };

export default async function WatchPage({ searchParams }: Props) {
  const { ten } = await searchParams;
  const query = ten?.trim() ?? "";
  const service = getRadarService();
  const analysis = query.length >= 2 ? await service.analyzeProductName(query) : null;
  const watches = await service.listWatchesWithAnalysis();
  return (
    <>
      <h1>Theo dõi sản phẩm — soi ads đang chạy</h1>
      <p className="muted">
        Ghi tên sản phẩm rồi đối chiếu với quảng cáo bạn đã lưu. Không phải số chạy ads toàn thị trường
        Facebook — chỉ đếm bài trong dữ liệu Radar.
      </p>
      <div className="banner">
        Giá cạnh tên là ước lượng: giá bạn nhập khi lưu thẻ, số VND đọc từ nội dung ads, và khoảng giá
        phổ biến cùng loại trên sàn VN. Không crawl Shopee/TikTok/Facebook.
      </div>
      <WatchPanel initialQuery={query} initialAnalysis={analysis} initialWatches={watches} />
    </>
  );
}
