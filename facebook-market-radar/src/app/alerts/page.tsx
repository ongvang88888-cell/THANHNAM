import { ALERT_TYPE_VI } from "@/domain/alerts";
import { getRadarService } from "@/server/radar";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  const alerts = await getRadarService().listAlerts();
  return (
    <>
      <h1>Cảnh báo</h1>
      <p className="muted">
        Trang mới, nội dung mới, tăng tốc, hoặc thẻ mới trên trang đang theo — chỉ từ dữ liệu bạn đã
        lưu. Radar không tự kéo Facebook.
      </p>
      {alerts.length === 0 ? <p className="muted">Chưa có cảnh báo.</p> : null}
      {alerts.map((alert, index) => (
        <article className="card" key={`${alert.type}-${alert.pageId}-${index}`}>
          <span className={`badge ${alert.type === "SURGE" ? "warn" : ""}`}>
            {ALERT_TYPE_VI[alert.type]}
          </span>
          <h2>{alert.title}</h2>
          <p className="muted">{alert.detail}</p>
        </article>
      ))}
    </>
  );
}
