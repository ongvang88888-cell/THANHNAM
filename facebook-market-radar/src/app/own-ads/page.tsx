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
      <h1>Ads của tôi</h1>
      <div className="banner">
        Số liệu này đến từ Marketing API (hoặc fixture local). Không trộn vào HeatScore thị trường.
      </div>
      <div className="cards">
        <div className="card">
          <div className="n">{formatMinor(totals.spendMinor)}</div>
          <div className="muted">Spend (đơn vị tài khoản)</div>
        </div>
        <div className="card">
          <div className="n">{totals.purchases}</div>
          <div className="muted">Purchases</div>
        </div>
        <div className="card">
          <div className="n">{totals.roas ?? "—"}</div>
          <div className="muted">ROAS (chỉ khi có purchase value)</div>
        </div>
      </div>
      <p className="muted">estimated: {String(totals.estimated)} — đây là số thật của tài khoản đã kết nối.</p>
      <OwnAdsSync />
      <table>
        <thead>
          <tr>
            <th>Ngày</th>
            <th>Campaign</th>
            <th>Spend</th>
            <th>Impr.</th>
            <th>Purchases</th>
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
