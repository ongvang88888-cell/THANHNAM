import { getRadarService } from "@/server/radar";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  const alerts = await getRadarService().listAlerts();
  return (
    <>
      <h1>Cảnh báo</h1>
      <p className="muted">Page mới, creative mới, hoặc surge ads trong 7 ngày — dựa trên dữ liệu bạn đã lưu.</p>
      {alerts.length === 0 ? <p className="muted">Chưa có cảnh báo.</p> : null}
      {alerts.map((alert, index) => (
        <article className="card" key={`${alert.type}-${alert.pageId}-${index}`}>
          <span className={`badge ${alert.type === "SURGE" ? "warn" : ""}`}>{alert.type}</span>
          <h2>{alert.title}</h2>
          <p className="muted">{alert.detail}</p>
        </article>
      ))}
    </>
  );
}
