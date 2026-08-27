import { getRadarService } from "@/server/radar";

export const dynamic = "force-dynamic";

export default async function AdsPage() {
  const ads = await getRadarService().listAds();
  return (
    <>
      <h1>Ads đã lưu</h1>
      <p className="muted">{ads.length} bản ghi — nguồn manual / seed / licensed import.</p>
      <table>
        <thead>
          <tr>
            <th>Library ID</th>
            <th>Page</th>
            <th>Cụm</th>
            <th>Bắt đầu</th>
            <th>Active</th>
          </tr>
        </thead>
        <tbody>
          {ads.map((ad) => (
            <tr key={ad.libraryId}>
              <td>{ad.libraryId}</td>
              <td>{ad.pageId}</td>
              <td>{ad.clusterSlug}</td>
              <td>{ad.startDate}</td>
              <td>{ad.isActive ? "có" : "không"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
