import { readFile } from "node:fs/promises";
import path from "node:path";
import { LOCKED_NICHES } from "@/domain/niches";

export default async function NichesPage() {
  const v0Dir = path.join(process.cwd(), "docs/v0");
  const report = await readFile(path.join(v0Dir, "weekly-report.2026-W34.md"), "utf8");
  return (
    <>
      <h1>Vòng 0 — 5 ngách khóa</h1>
      <p className="muted">
        Chứng minh nhu cầu bằng sheet Ad Library trước khi tin UI. Xem{" "}
        <code>facebook-market-radar/docs/v0/</code>.
      </p>
      <ul>
        {LOCKED_NICHES.map((n) => (
          <li key={n.slug}>
            <strong>{n.nameVi}</strong> <span className="muted">({n.slug})</span>
          </li>
        ))}
      </ul>
      <h2>Báo cáo mẫu 2026-W34 (hư cấu)</h2>
      <pre className="report">{report}</pre>
    </>
  );
}
