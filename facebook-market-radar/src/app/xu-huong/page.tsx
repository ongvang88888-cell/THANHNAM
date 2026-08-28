import Link from "next/link";
import { adRunSummary } from "@/domain/product-watch";
import { parsePlatformTab, platformTab } from "@/domain/platform-dashboards";
import { TRENDING_DEFAULT_PLATFORM } from "@/domain/app-nav";
import { ProductCell } from "@/ui/product-cell";
import { PlatformWall } from "@/ui/platform-wall";
import { BestsellerPanel } from "@/ui/bestseller-panel";
import { ResearchGrid } from "@/ui/research-grid";
import { PageHead } from "@/ui/page-head";
import { getRadarService } from "@/server/radar";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ kenh?: string }>;
};

export default async function TrendPage({ searchParams }: Props) {
  const params = await searchParams;
  const nowMs = Date.now();
  const service = getRadarService();
  const kenh = parsePlatformTab(params.kenh, TRENDING_DEFAULT_PLATFORM);
  const [{ trending, fresh, hooks }, bestsellers] = await Promise.all([
    service.listTrendLanes(nowMs),
    service.listPlatformBestsellers(nowMs, kenh, { trang: 1 }),
  ]);
  return (
    <>
      <PageHead
        eyebrow="Mọi nền tảng"
        title="Xu hướng Shopee · Google · YouTube · Facebook"
        lede="Mỗi ô là một nền tảng — 999 tên nghiên cứu, không phải GMV toàn quốc. Lưới Facebook phía dưới chỉ thẻ đã lưu."
        actions={[
          { href: `/kenh/${kenh}`, label: "Thống kê kho" },
          { href: "/collect", label: "Nhập số", primary: true },
        ]}
      />
      <PlatformWall active={kenh} />
      <p className="muted">
        Đang xem <strong>{platformTab(kenh).labelVi}</strong> ·{" "}
        <Link href={`/top/${kenh}`}>Đủ 999 tên</Link> · <Link href={`/kenh/${kenh}`}>Kho {kenh}</Link>
      </p>
      <BestsellerPanel page={bestsellers} />
      <h2>Trending Facebook đã lưu ({trending.length})</h2>
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
