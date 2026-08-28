"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { LOCKED_NICHES } from "@/domain/niches";

const MEGA_SCAN_CAP = 1_000_000;

type MegaScanRow = {
  id: string;
  nicheSlug: string;
  nicheName: string;
  query: string;
  libraryUrl: string;
};

type MegaScanPage = {
  total: number;
  offset: number;
  hasMore: boolean;
  page: MegaScanRow[];
};

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function formatCount(n: number): string {
  return n.toLocaleString("vi-VN");
}

export function MegaScanPanel({ initialQuery = "", initialNiche = "" }: { initialQuery?: string; initialNiche?: string }) {
  const [niche, setNiche] = useState(initialNiche);
  const [q, setQ] = useState(initialQuery);
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<MegaScanPage | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("offset", String(offset));
    params.set("limit", "40");
    if (niche) {
      params.set("niche", niche);
    }
    if (q.trim()) {
      params.set("q", q.trim());
    }
    return params.toString();
  }, [niche, offset, q]);

  const load = useCallback(async (signal?: AbortSignal) => {
    setPending(true);
    setError(null);
    const response = await fetch(`/api/quet/mo-rong?${queryString}`, { signal });
    const json = (await response.json()) as MegaScanPage & { error?: string };
    if (!response.ok) {
      setError(json.error ?? "Không tải được hàng đợi mở rộng");
      setPending(false);
      return;
    }
    setData(json);
    setPending(false);
  }, [queryString]);

  useEffect(() => {
    const ac = new AbortController();
    void load(ac.signal).catch((err: unknown) => {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      setError("Không tải được hàng đợi mở rộng");
      setPending(false);
    });
    return () => ac.abort();
  }, [load]);

  function applyFilters(event: FormEvent) {
    event.preventDefault();
    setOffset(0);
  }

  async function copyPage(rows: MegaScanRow[]) {
    const ok = await copyText(rows.map((row) => row.libraryUrl).join("\n"));
    setCopyMessage(ok ? `Đã copy ${rows.length} URL Thư viện` : "Trình duyệt chặn clipboard");
  }

  const rows = data?.page ?? [];
  const total = data?.total ?? MEGA_SCAN_CAP;

  return (
    <section className="mega-scan">
      <h2>Hàng đợi mở rộng — ~{formatCount(MEGA_SCAN_CAP)} ô tìm Thư viện</h2>
      <p className="muted">
        Đây <strong>không</strong> phải {formatCount(MEGA_SCAN_CAP)} ads Facebook đã kéo về. Radar sinh URL search
        chính thức (VN, đang chạy) từ tên sản phẩm VN để bạn tự mở Meta rồi lưu thẻ. Bảng xếp hạng vẫn chỉ hiện ads
        đã lưu.
      </p>
      <form className="scan-toolbar" onSubmit={applyFilters}>
        <label>
          Ngành
          <select value={niche} onChange={(event) => { setNiche(event.target.value); setOffset(0); }}>
            <option value="">Tất cả ngành</option>
            {LOCKED_NICHES.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.nameVi}
              </option>
            ))}
          </select>
        </label>
        <label>
          Lọc tên / từ khóa
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="đèn led, serum, bỉm…"
          />
        </label>
        <button type="submit" disabled={pending}>
          {pending ? "Đang dựng…" : "Áp dụng"}
        </button>
      </form>
      {error ? <p className="err">{error}</p> : null}
      {pending && !data ? <p className="muted">Đang dựng hàng đợi mở rộng lần đầu (không gọi Facebook)…</p> : null}
      {data ? (
        <>
          <p className="muted">
            Đang xem {formatCount(data.offset + 1)}–{formatCount(data.offset + rows.length)} /{" "}
            {formatCount(total)} cành khớp bộ lọc.
          </p>
          <div className="watch-actions">
            <button type="button" onClick={() => void copyPage(rows)} disabled={rows.length === 0}>
              Copy {rows.length} URL
            </button>
            {rows[0] ? (
              <a className="btn" href={rows[0].libraryUrl} target="_blank" rel="noreferrer">
                Mở cành đầu
              </a>
            ) : null}
            <button
              type="button"
              className="secondary"
              disabled={offset === 0 || pending}
              onClick={() => setOffset(Math.max(0, offset - 40))}
            >
              Trang trước
            </button>
            <button
              type="button"
              className="secondary"
              disabled={!data.hasMore || pending}
              onClick={() => setOffset(offset + 40)}
            >
              40 cành tiếp
            </button>
          </div>
          {copyMessage ? <p className="ok">{copyMessage}</p> : null}
          <table>
            <thead>
              <tr>
                <th></th>
                <th>Tên / từ khóa mở rộng</th>
                <th>Ngành</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <a href={row.libraryUrl} target="_blank" rel="noreferrer">
                      Mở Thư viện
                    </a>
                  </td>
                  <td>
                    <strong>{row.query}</strong>
                    <div className="muted">Ô tìm chính thức — không scrape</div>
                  </td>
                  <td>{row.nicheName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}
    </section>
  );
}
