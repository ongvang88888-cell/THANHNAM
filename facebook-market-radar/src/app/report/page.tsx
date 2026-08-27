import { getRadarService } from "@/server/radar";

export const dynamic = "force-dynamic";

export default async function ReportPage() {
  const markdown = await getRadarService().weeklyReport(Date.now());
  return (
    <>
      <h1>Báo cáo tuần</h1>
      <p className="muted">Sinh từ snapshot hiện tại. Mẫu Vòng 0 thủ công nằm ở docs/v0.</p>
      <pre className="report">{markdown}</pre>
    </>
  );
}
