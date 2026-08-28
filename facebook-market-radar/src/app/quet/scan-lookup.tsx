"use client";

import { LibrarySearchLinks } from "@/ui/library-search-links";
import { ProductCell } from "@/ui/product-cell";
import { adRunSummary } from "@/domain/product-watch";
import type { ScanLookup } from "@/domain/ad-library-scan";

function viaLabel(via: "name" | "copy" | "both"): string {
  if (via === "copy") {
    return "Khớp nội dung ads";
  }
  if (via === "both") {
    return "Khớp tên + nội dung";
  }
  return "Khớp tên";
}

function LookupResult({ lookup }: { lookup: ScanLookup }) {
  const { analysis } = lookup;
  return (
    <div className="card watch-result">
      <div className="watch-result-head">
        <strong>{analysis.query}</strong>
        <span className={analysis.intensity === "chua-co" ? "badge muted" : "badge warn"}>
          {analysis.intensityLabel}
        </span>
      </div>
      <p className="muted">
        {adRunSummary(analysis.activeAdCount, analysis.distinctPageCount, analysis.totalAdCount)}
        {analysis.clusterCount > 0
          ? ` · khớp ${analysis.clusterCount} cụm (tên hoặc từ khóa trong bài)`
          : " · chưa khớp dữ liệu đã lưu — mở Thư viện để bắt bài mới"}
      </p>
      <LibrarySearchLinks query={lookup.query} variants={lookup.variants} />
      {analysis.matches.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>Sản phẩm / bài khớp</th>
              <th>Cách khớp</th>
              <th>Bài đang chạy</th>
            </tr>
          </thead>
          <tbody>
            {analysis.matches.map((row) => (
              <tr key={row.clusterSlug}>
                <td>
                  <ProductCell
                    title={row.clusterTitle}
                    imageUrls={[]}
                    price={row.price}
                    adSummary={adRunSummary(row.activeAdCount, row.distinctPageCount, row.totalAdCount)}
                  />
                  {row.copySnippet ? <div className="muted">“…{row.copySnippet}…”</div> : null}
                </td>
                <td>
                  <span className="badge">{viaLabel(row.matchVia)}</span>
                </td>
                <td>
                  {row.activeAdCount} / {row.distinctPageCount} trang
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}

export function ScanLookupPanel({
  initialQuery,
  initialLookup,
}: {
  initialQuery: string;
  initialLookup: ScanLookup | null;
}) {
  return (
    <section className="scan-lookup">
      <h2>Tìm bài đang chạy theo tên / từ khóa</h2>
      <p className="muted">
        Gõ tên sản phẩm hoặc cụm từ trong nội dung ads đã lưu. Radar đối chiếu dữ liệu đã lưu và đưa URL
        Thư viện chính thức (VN, đang chạy) để bạn bắt thêm thẻ. Không phải tổng ads Facebook.
      </p>
      <form className="watch-search" action="/quet" method="get">
        <label>
          Tên sản phẩm hoặc từ khóa trong bài viết
          <input
            name="ten"
            defaultValue={initialQuery}
            placeholder="Serum Niacinamide, kem chống nắng, đèn cảm ứng…"
          />
        </label>
        <button type="submit">Tìm bài đang chạy</button>
      </form>
      {initialLookup ? <LookupResult lookup={initialLookup} /> : null}
    </section>
  );
}
