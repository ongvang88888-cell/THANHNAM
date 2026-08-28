import Link from "next/link";
import { CREATIVE_ANGLE_VI, detectCreativeAngles } from "@/domain/creative-angles";
import { classifyLanding, LANDING_KIND_VI } from "@/domain/landing";
import { formatVnd } from "@/domain/price";
import { productImagePath, uniqueImageUrls } from "@/domain/product-image";
import { isCreativeAngle } from "@/domain/creative-angles";
import { ProductCell } from "@/ui/product-cell";
import { getRadarService } from "@/server/radar";
import { AdActions } from "./ad-actions";

export const dynamic = "force-dynamic";

export default async function AdsPage() {
  const service = getRadarService();
  const ads = await service.listAds();
  const clusters = await service.listClusters();
  const boards = await service.listBoards();
  const tags = await service.listAdTags();
  const bySlug = new Map(clusters.map((cluster) => [cluster.slug, cluster]));
  const tagsById = new Map<string, string[]>();
  for (const tag of tags) {
    const prev = tagsById.get(tag.libraryId) ?? [];
    tagsById.set(tag.libraryId, [...prev, tag.tag]);
  }
  return (
    <>
      <h1>Quảng cáo đã lưu</h1>
      <p className="muted">
        {ads.length} bản ghi — nguồn nhập tay / dữ liệu mẫu / file đã mua.{" "}
        <Link href="/bo-suu-tap">Bộ sưu tập</Link>
      </p>
      <table>
        <thead>
          <tr>
            <th>Mã thư viện</th>
            <th>Trang</th>
            <th>Sản phẩm</th>
            <th>Đích</th>
            <th>Góc</th>
            <th>Giá nhập</th>
            <th>Ngày bắt đầu</th>
            <th>Đang chạy</th>
            <th>Ghim / nhãn</th>
          </tr>
        </thead>
        <tbody>
          {ads.map((ad) => {
            const cluster = bySlug.get(ad.clusterSlug);
            const landing = classifyLanding(ad.landingUrl);
            const detected = detectCreativeAngles([ad.title, ad.body, cluster?.title]);
            const userTags = (tagsById.get(ad.libraryId) ?? []).filter(isCreativeAngle);
            const angles = [...new Set([...detected, ...userTags])];
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
                    href={`/san-pham/${ad.clusterSlug}`}
                  />
                </td>
                <td>{LANDING_KIND_VI[landing]}</td>
                <td>{angles.map((angle) => CREATIVE_ANGLE_VI[angle]).join(", ") || "—"}</td>
                <td>{ad.listingPriceVnd != null ? formatVnd(ad.listingPriceVnd) : "—"}</td>
                <td>{ad.startDate}</td>
                <td>{ad.isActive ? "có" : "không"}</td>
                <td>
                  <AdActions libraryId={ad.libraryId} boards={boards} initialTags={userTags} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
