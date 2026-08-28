import { OwnAdsSync } from "./own-ads-sync";
import { getRadarService } from "@/server/radar";

export const dynamic = "force-dynamic";

function formatMinor(value: number | null): string {
  if (value === null) {
    return "—";
  }
  return (value / 100).toFixed(2);
}

export default async function OwnAdsPage() {
  const { rows, totals } = await getRadarService().ownInsightsSummary();
  return (
    <>
      <p className="eyebrow">My Ads</p>
      <h1>Tài khoản của tôi</h1>
      <div className="banner">
        Số liệu này đến từ Marketing API (hoặc dữ liệu mẫu nội bộ). Không trộn vào điểm nóng thị trường.
      </div>
      <div className="cards">
        <div className="card">
          <div className="n">{formatMinor(totals.spendMinor)}</div>
          <div className="muted">Chi tiêu (đơn vị tài khoản)</div>
        </div>
        <div className="card">
          <div className="n">{totals.purchases}</div>
          <div className="muted">Lượt mua</div>
        </div>
        <div className="card">
          <div className="n">{totals.roas ?? "—"}</div>
          <div className="muted">Tỷ suất (chỉ khi có giá trị mua)</div>
        </div>
      </div>
      <p className="muted">
        Đây là số thật của tài khoản đã kết nối — không dùng để xếp hạng thị trường. Ước lượng:{" "}
        {totals.estimated ? "có" : "không"}.
      </p>
      <OwnAdsSync />
      <table>
        <thead>
          <tr>
            <th>Ngày</th>
            <th>Chiến dịch</th>
            <th>Chi tiêu</th>
            <th>Lượt hiển thị</th>
            <th>Lượt mua</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.campaignId}-${row.date}`}>
              <td>{row.date}</td>
              <td>{row.campaignName}</td>
              <td>{formatMinor(row.spendMinor)}</td>
              <td>{row.impressions}</td>
              <td>{row.purchases}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
