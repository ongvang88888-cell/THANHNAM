import Link from "next/link";
import { adRunSummary } from "@/domain/product-watch";
import { parsePlatformTab } from "@/domain/platform-dashboards";
import { ProductCell } from "@/ui/product-cell";
import { PlatformPanel } from "@/ui/platform-panel";
import { ResearchGrid } from "@/ui/research-grid";
import { getRadarService } from "@/server/radar";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ kenh?: string }>;
};

export default async function TrendPage({ searchParams }: Props) {
  const params = await searchParams;
  const nowMs = Date.now();
  const service = getRadarService();
  const { trending, fresh, hooks } = await service.listTrendLanes(nowMs);
  const kenh = parsePlatformTab(params.kenh);
  const dashboard = await service.listPlatformDashboard(nowMs, kenh);
  return (
    <>
      <p className="eyebrow">Trending + sàn</p>
      <h1>Xu hướng trên thẻ đã lưu</h1>
      <div className="banner">
        Khối dưới đây là <strong>từng nền tảng</strong> (Shopee, Lazada, Google, YouTube…) trên kho đã lưu — bấm
        chip. Lưới Trending phía dưới vẫn là Facebook đã lưu, không phải ranking toàn quốc. Radar không crawl.
      </div>
      <PlatformPanel dashboard={dashboard} base="kenh" limit={8} showTimeline={false} />
      <p className="muted">
        <Link href={`/top/${kenh}`}>999 tên {dashboard.tab.labelVi}</Link> ·{" "}
        <Link href={`/kenh/${kenh}`}>Trang kênh đủ</Link> · <Link href="/manh">Ads mạnh nhất</Link> ·{" "}
        <Link href="/?lane=trending">Lọc bảng trending</Link> · <Link href="/?view=grid">Lưới creative</Link>
      </p>
      <h2>Trending ({trending.length})</h2>
      {trending.length === 0 ? <p className="muted">Chưa đủ thẻ mạnh.</p> : <ResearchGrid rows={trending} />}
      <h2>Fresh / mới nổi ({fresh.length})</h2>
      {fresh.length === 0 ? (
        <p className="muted">Chưa có sản phẩm mới trong 7 ngày trên thẻ đã lưu.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Sản phẩm</th>
              <th>Tốc độ mới</th>
              <th>Điểm nóng</th>
            </tr>
          </thead>
          <tbody>
            {fresh.map((row) => (
              <tr key={row.clusterSlug}>
                <td>
                  <ProductCell
                    title={row.clusterTitle}
                    imageUrls={row.imageUrls}
                    price={row.price}
                    adSummary={adRunSummary(row.activeAdCount, row.distinctPageCount, row.totalAdCount)}
                    href={`/san-pham/${row.clusterSlug}`}
                  />
                </td>
                <td>{row.scores.velocity}</td>
                <td>
                  <span className="badge warn">{row.scores.heat} ước lượng</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <h2>Hook / cụm copy hay gặp</h2>
      <p className="muted">Rút từ title + body thẻ đang chạy bạn đã lưu — mở Thư viện để bắt thêm, không scrape.</p>
      {hooks.length === 0 ? (
        <p className="muted">Chưa đủ nội dung ads để rút hook.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Cụm</th>
              <th>Lần thấy</th>
              <th>Ngành</th>
              <th>Thư viện</th>
            </tr>
          </thead>
          <tbody>
            {hooks.map((hook) => (
              <tr key={`${hook.nicheSlug}-${hook.phrase}`}>
                <td>{hook.phrase}</td>
                <td>{hook.count}</td>
                <td>{hook.nicheSlug}</td>
                <td>
                  <a href={hook.libraryUrl} target="_blank" rel="noreferrer">
                    Tìm
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
