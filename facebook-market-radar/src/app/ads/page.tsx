import { formatVnd } from "@/domain/price";
import { productImagePath, uniqueImageUrls } from "@/domain/product-image";
import { ProductCell } from "@/ui/product-cell";
import { getRadarService } from "@/server/radar";

export const dynamic = "force-dynamic";

export default async function AdsPage() {
  const service = getRadarService();
  const ads = await service.listAds();
  const clusters = await service.listClusters();
  const bySlug = new Map(clusters.map((cluster) => [cluster.slug, cluster]));
  return (
    <>
      <h1>Quảng cáo đã lưu</h1>
      <p className="muted">{ads.length} bản ghi — nguồn nhập tay / dữ liệu mẫu / file đã mua.</p>
      <table>
        <thead>
          <tr>
            <th>Mã thư viện</th>
            <th>Trang</th>
            <th>Sản phẩm</th>
            <th>Giá nhập</th>
            <th>Ngày bắt đầu</th>
            <th>Đang chạy</th>
          </tr>
        </thead>
        <tbody>
          {ads.map((ad) => {
            const cluster = bySlug.get(ad.clusterSlug);
            return (
              <tr key={ad.libraryId}>
                <td>{ad.libraryId}</td>
                <td>{ad.pageId}</td>
                <td>
                  <ProductCell
                    title={cluster?.title ?? ad.clusterSlug}
                    imageUrls={uniqueImageUrls([
                      ad.imageUrl,
                      cluster?.imageUrl,
                      cluster
                        ? productImagePath(cluster.slug, cluster.title, cluster.nicheSlug)
                        : productImagePath(ad.clusterSlug, ad.clusterSlug, "khac"),
                    ])}
                  />
                </td>
                <td>{ad.listingPriceVnd != null ? formatVnd(ad.listingPriceVnd) : "—"}</td>
                <td>{ad.startDate}</td>
                <td>{ad.isActive ? "có" : "không"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
