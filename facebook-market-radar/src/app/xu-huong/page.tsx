import Link from "next/link";
import { adRunSummary } from "@/domain/product-watch";
import { ProductCell } from "@/ui/product-cell";
import { ResearchGrid } from "@/ui/research-grid";
import { getRadarService } from "@/server/radar";

export const dynamic = "force-dynamic";

export default async function TrendPage() {
  const { trending, fresh, hooks } = await getRadarService().listTrendLanes(Date.now());
  return (
    <>
      <h1>Xu hướng trên thẻ đã lưu</h1>
      <div className="banner">
        Trending = điểm nóng / độ bền mạnh trên dữ liệu bạn lưu. Fresh = mới thấy ≤ 7 ngày hoặc tốc độ mới cao
        nhưng chưa bền. Không phải ranking Facebook toàn quốc. Radar không tự kéo ads.
      </div>
      <p className="muted">
        <Link href="/?lane=trending">Lọc bảng trending</Link> · <Link href="/?lane=fresh">Lọc fresh</Link> ·{" "}
        <Link href="/?view=grid">Lưới creative</Link>
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
