"use client";

import { useMemo, useState } from "react";
import { ProductCell } from "@/ui/product-cell";
import { collectJsonHeaders } from "@/ui/collect-headers";
import { CollectKeyField } from "@/ui/collect-key-field";
import { LibrarySearchLinks } from "@/ui/library-search-links";
import { adRunSummary, type ProductAdAnalysis } from "@/domain/product-watch";
import type { ScanLookup } from "@/domain/ad-library-scan";

type WatchRow = {
  slug: string;
  name: string;
  note: string | null;
  analysis: ProductAdAnalysis;
};

function intensityClass(intensity: ProductAdAnalysis["intensity"]): string {
  if (intensity === "nhieu") {
    return "badge danger";
  }
  if (intensity === "vua") {
    return "badge warn";
  }
  if (intensity === "it") {
    return "badge";
  }
  return "badge muted";
}

function viaLabel(via: ProductAdAnalysis["matches"][number]["matchVia"]): string {
  if (via === "copy") {
    return "Khớp nội dung ads";
  }
  if (via === "both") {
    return "Khớp tên + nội dung";
  }
  return "Khớp tên";
}

function AnalysisCard({
  analysis,
  variants,
}: {
  analysis: ProductAdAnalysis;
  variants?: Array<{ query: string; libraryUrl: string }>;
}) {
  return (
    <div className="card watch-result">
      <div className="watch-result-head">
        <strong>{analysis.query}</strong>
        <span className={intensityClass(analysis.intensity)}>{analysis.intensityLabel}</span>
      </div>
      <p className="muted">
        {adRunSummary(analysis.activeAdCount, analysis.distinctPageCount, analysis.totalAdCount)}
        {analysis.clusterCount > 0
          ? ` · khớp ${analysis.clusterCount} cụm (tên hoặc từ khóa trong bài)`
          : " · chưa khớp dữ liệu đã lưu"}
      </p>
      <LibrarySearchLinks query={analysis.query} variants={variants} />
      {analysis.price ? (
        <p>
          Giá ước lượng: <strong>{analysis.price.label}</strong>
          <span className="muted"> — {analysis.price.note}</span>
        </p>
      ) : null}
      {analysis.matches.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>Sản phẩm khớp</th>
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
                  <div className="muted">{Math.round(row.matchScore * 100)}%</div>
                </td>
                <td>
                  {row.activeAdCount} / {row.distinctPageCount} trang
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="muted">
          Chưa thấy quảng cáo đã lưu khớp tên hoặc từ khóa trong bài. Mở Thư viện phía trên rồi lưu thẻ.
        </p>
      )}
    </div>
  );
}

export function WatchPanel({
  initialQuery,
  initialAnalysis,
  initialVariants = [],
  initialWatches,
}: {
  initialQuery: string;
  initialAnalysis: ProductAdAnalysis | null;
  initialVariants?: Array<{ query: string; libraryUrl: string }>;
  initialWatches: WatchRow[];
}) {
  const [query, setQuery] = useState(initialQuery);
  const [analysis, setAnalysis] = useState<ProductAdAnalysis | null>(initialAnalysis);
  const [variants, setVariants] = useState<Array<{ query: string; libraryUrl: string }>>(initialVariants);
  const [watches, setWatches] = useState(initialWatches);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const savedSlugs = useMemo(() => new Set(watches.map((row) => row.slug)), [watches]);

  async function analyzeName(name: string) {
    const ten = name.trim();
    if (ten.length < 2) {
      setError("Nhập tên sản phẩm (từ 2 ký tự)");
      return;
    }
    setPending(true);
    setError(null);
    setMessage(null);
    const response = await fetch(`/api/theo-doi?ten=${encodeURIComponent(ten)}`);
    const json = (await response.json()) as ScanLookup & { error?: string };
    setPending(false);
    if (!response.ok || !json.analysis) {
      setError(json.error ?? "Không phân tích được");
      return;
    }
    setAnalysis(json.analysis);
    setVariants(json.variants ?? []);
    const url = new URL(window.location.href);
    url.searchParams.set("ten", ten);
    window.history.replaceState(null, "", url.toString());
  }

  async function saveWatch() {
    const name = (analysis?.query ?? query).trim();
    if (name.length < 2) {
      setError("Nhập tên sản phẩm trước khi ghi");
      return;
    }
    setPending(true);
    setError(null);
    setMessage(null);
    const response = await fetch("/api/theo-doi", {
      method: "POST",
      headers: collectJsonHeaders(),
      body: JSON.stringify({ name, note: note.trim() || undefined }),
    });
    const json = (await response.json()) as {
      watch?: { slug: string; name: string; note: string | null };
      analysis?: ProductAdAnalysis;
      error?: string;
    };
    setPending(false);
    if (!response.ok || !json.watch || !json.analysis) {
      setError(json.error ?? "Không ghi được tên sản phẩm");
      return;
    }
    setAnalysis(json.analysis);
    setWatches((current) => {
      const next = current.filter((row) => row.slug !== json.watch!.slug);
      next.unshift({ ...json.watch!, analysis: json.analysis! });
      return next;
    });
    setMessage(`Đã ghi “${json.watch.name}” — ${json.analysis.intensityLabel}`);
  }

  async function removeWatch(slug: string) {
    setPending(true);
    setError(null);
    const response = await fetch(`/api/theo-doi?slug=${encodeURIComponent(slug)}`, {
      method: "DELETE",
      headers: collectJsonHeaders(),
    });
    const json = (await response.json()) as { error?: string };
    setPending(false);
    if (!response.ok) {
      setError(json.error ?? "Không xóa được");
      return;
    }
    setWatches((current) => current.filter((row) => row.slug !== slug));
  }

  return (
    <div className="stack watch-panel">
      <form
        className="watch-search"
        onSubmit={(event) => {
          event.preventDefault();
          void analyzeName(query);
        }}
      >
        <label>
          Tên sản phẩm hoặc từ khóa trong bài ads
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ví dụ: Serum Niacinamide, kem chống nắng, Đèn LED"
          />
        </label>
        <button type="submit" disabled={pending}>
          {pending ? "Đang soi…" : "Tìm bài đang chạy"}
        </button>
      </form>
      <CollectKeyField />
      <label>
        Ghi chú (không bắt buộc, khi lưu danh sách)
        <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="VD: hàng đang cân nhắc nhập" />
      </label>
      <div className="watch-actions">
        <button type="button" className="secondary" disabled={pending} onClick={() => void saveWatch()}>
          Ghi tên này vào danh sách theo dõi
        </button>
      </div>
      {error ? <p className="err">{error}</p> : null}
      {message ? <p className="ok">{message}</p> : null}
      {analysis ? <AnalysisCard analysis={analysis} variants={variants} /> : null}
      {analysis && savedSlugs.has(analysis.slug) ? (
        <p className="muted">Tên này đã nằm trong danh sách theo dõi.</p>
      ) : null}

      <h2>Danh sách đã ghi</h2>
      {watches.length === 0 ? (
        <p className="muted">Chưa ghi tên nào. Phân tích rồi bấm lưu để theo tuần.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Tên đã ghi</th>
              <th>Cường độ ads</th>
              <th>Bài đang chạy</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {watches.map((row) => (
              <tr key={row.slug}>
                <td>
                  <div className="product-meta">
                    <span className="product-name">{row.name}</span>
                    {row.analysis.price ? <span className="product-price">{row.analysis.price.label}</span> : null}
                    {row.note ? <span className="product-ads">{row.note}</span> : null}
                  </div>
                </td>
                <td>
                  <span className={intensityClass(row.analysis.intensity)}>{row.analysis.intensityLabel}</span>
                </td>
                <td>
                  {adRunSummary(
                    row.analysis.activeAdCount,
                    row.analysis.distinctPageCount,
                    row.analysis.totalAdCount,
                  )}
                </td>
                <td>
                  <button type="button" className="secondary" disabled={pending} onClick={() => void removeWatch(row.slug)}>
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
