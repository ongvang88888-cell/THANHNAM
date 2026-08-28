import Link from "next/link";
import { LEGAL_FILL_PATHS } from "@/domain/platform-dashboards";

export function FillPaths() {
  return (
    <section className="fill-paths" aria-label="Mọi cách lấy số hợp pháp">
      <h2>Mọi cách lấy đủ số — không crawl</h2>
      <p className="muted">
        Không có dump Tiki / Sendo / YouTube / Google. Radar chỉ dùng thẻ đã lưu, số bạn nhập, feed đã
        mua, và Data API cho video ID đã có trên kho.
      </p>
      <ol className="fill-path-list">
        {LEGAL_FILL_PATHS.map((path, index) => (
          <li key={path.id}>
            <strong>
              {index + 1}. {path.titleVi}
            </strong>
            <span className="muted">{path.detailVi}</span>
            <Link href={path.href}>Mở</Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
