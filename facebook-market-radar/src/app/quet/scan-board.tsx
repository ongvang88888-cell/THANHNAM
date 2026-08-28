"use client";

import { useEffect, useMemo, useState } from "react";
import { scanBranchKindLabel, type ScanBranch, type ScanPlan } from "@/domain/ad-library-scan";
import { NICHE_GROUPS } from "@/domain/niches";
import { SheetImportForm } from "../collect/sheet-import";

const OPENED_KEY = "fmr-scan-opened-v1";

function loadOpened(): Record<string, number> {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(OPENED_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, number>)
      : {};
  } catch {
    return {};
  }
}

function saveOpened(map: Record<string, number>): void {
  window.localStorage.setItem(OPENED_KEY, JSON.stringify(map));
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function BranchRow({
  row,
  opened,
  onOpen,
}: {
  row: ScanBranch;
  opened: boolean;
  onOpen: (id: string) => void;
}) {
  return (
    <tr className={row.covered ? "" : "scan-uncovered"}>
      <td>
        <a
          href={row.libraryUrl}
          target="_blank"
          rel="noreferrer"
          onClick={() => onOpen(row.id)}
        >
          Mở Thư viện
        </a>
      </td>
      <td>
        <strong>{row.query}</strong>
        <div className="muted">{scanBranchKindLabel(row.kind)}</div>
        {opened ? <div className="muted">Đã mở trên máy này</div> : null}
      </td>
      <td>{row.nicheName}</td>
      <td>{row.group}</td>
      <td>
        {row.covered ? (
          <span className="badge">Đã có mẫu</span>
        ) : row.nicheHasData ? (
          <span className="badge warn">Cành trống</span>
        ) : (
          <span className="badge danger">Ngành trống</span>
        )}
      </td>
      <td>{row.matchedProductCount || "—"}</td>
    </tr>
  );
}

export function ScanBoard({
  plan,
  initialGroup,
  initialNiche,
}: {
  plan: ScanPlan;
  initialGroup?: string;
  initialNiche?: string;
}) {
  const [group, setGroup] = useState(initialGroup ?? "");
  const [niche, setNiche] = useState(initialNiche ?? "");
  const [onlyUncovered, setOnlyUncovered] = useState(true);
  const [onlyEmptyNiche, setOnlyEmptyNiche] = useState(false);
  const [query, setQuery] = useState("");
  const [opened, setOpened] = useState<Record<string, number>>({});
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  useEffect(() => {
    setOpened(loadOpened());
  }, []);

  function markOpened(id: string) {
    setOpened((current) => {
      const next = { ...current, [id]: Date.now() };
      saveOpened(next);
      return next;
    });
  }

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return plan.branches.filter((row) => {
      if (group && row.group !== group) {
        return false;
      }
      if (niche && row.nicheSlug !== niche) {
        return false;
      }
      if (onlyUncovered && row.covered) {
        return false;
      }
      if (onlyEmptyNiche && row.nicheHasData) {
        return false;
      }
      if (needle && !row.query.toLowerCase().includes(needle) && !row.nicheName.toLowerCase().includes(needle)) {
        return false;
      }
      return true;
    });
  }, [group, niche, onlyEmptyNiche, onlyUncovered, plan.branches, query]);

  const batch = useMemo(() => {
    if (group || niche || query || onlyEmptyNiche) {
      return filtered.slice(0, 20);
    }
    return plan.nextBatch;
  }, [filtered, group, niche, onlyEmptyNiche, plan.nextBatch, query]);

  function inScope(row: ScanBranch): boolean {
    if (group && row.group !== group) {
      return false;
    }
    if (niche && row.nicheSlug !== niche) {
      return false;
    }
    return true;
  }

  const running = useMemo(() => plan.runningProducts.filter(inScope), [group, niche, plan.runningProducts]);
  const moreRunning = useMemo(() => {
    const scoped = plan.moreRunningBatch.filter(inScope);
    if (group || niche) {
      return [
        ...plan.nameVariants.filter(inScope),
        ...plan.copyKeywords.filter(inScope),
        ...plan.runningProducts.filter(inScope),
      ].slice(0, 20);
    }
    return scoped;
  }, [group, niche, plan.copyKeywords, plan.moreRunningBatch, plan.nameVariants, plan.runningProducts]);
  const copies = useMemo(() => plan.copyKeywords.filter(inScope), [group, niche, plan.copyKeywords]);
  const variants = useMemo(() => plan.nameVariants.filter(inScope), [group, niche, plan.nameVariants]);

  async function copyBatch() {
    const text = batch.map((row) => row.libraryUrl).join("\n");
    const ok = await copyText(text);
    setCopyMessage(ok ? `Đã copy ${batch.length} URL Thư viện` : "Trình duyệt chặn clipboard — copy tay từ bảng");
  }

  return (
    <div className="scan-board">
      <div className="scan-toolbar">
        <label>
          Nhóm
          <select value={group} onChange={(event) => setGroup(event.target.value)}>
            <option value="">Tất cả nhóm</option>
            {NICHE_GROUPS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label>
          Ngành
          <select value={niche} onChange={(event) => setNiche(event.target.value)}>
            <option value="">Tất cả ngành</option>
            {plan.branches
              .filter((row, index, list) => list.findIndex((item) => item.nicheSlug === row.nicheSlug) === index)
              .filter((row) => !group || row.group === group)
              .map((row) => (
                <option key={row.nicheSlug} value={row.nicheSlug}>
                  {row.nicheName}
                </option>
              ))}
          </select>
        </label>
        <label>
          Tìm cành
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="serum, bỉm, đèn…" />
        </label>
        <label className="scan-check">
          <input
            type="checkbox"
            checked={onlyUncovered}
            onChange={(event) => setOnlyUncovered(event.target.checked)}
          />
          Chỉ cành chưa có mẫu
        </label>
        <label className="scan-check">
          <input
            type="checkbox"
            checked={onlyEmptyNiche}
            onChange={(event) => setOnlyEmptyNiche(event.target.checked)}
          />
          Chỉ ngành trống
        </label>
      </div>

      <h2>Lô tiếp theo — {batch.length} cành ưu tiên</h2>
      <p className="muted">
        Mở từng URL trên Meta (quốc gia VN, đang chạy). Radar chỉ biết thẻ bạn lưu sau đó. Điểm nóng vẫn
        ước lượng.
      </p>
      <div className="watch-actions">
        <button type="button" onClick={() => void copyBatch()}>
          Copy {batch.length} URL
        </button>
        {batch[0] ? (
          <a className="btn" href={batch[0].libraryUrl} target="_blank" rel="noreferrer" onClick={() => markOpened(batch[0]!.id)}>
            Mở cành đầu
          </a>
        ) : null}
      </div>
      {copyMessage ? <p className="ok">{copyMessage}</p> : null}
      {batch.length === 0 ? (
        <p className="muted">Không còn cành trống với bộ lọc này.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Cành từ khóa</th>
              <th>Ngành</th>
              <th>Nhóm</th>
              <th>Phủ</th>
              <th>SP khớp</th>
            </tr>
          </thead>
          <tbody>
            {batch.map((row) => (
              <BranchRow key={row.id} row={row} opened={Boolean(opened[row.id])} onOpen={markOpened} />
            ))}
          </tbody>
        </table>
      )}

      <h2>Lô tìm thêm bài đang chạy — {moreRunning.length}</h2>
      <p className="muted">
        Biến thể tên sản phẩm + từ khóa rút từ nội dung ads đã lưu. Mở Thư viện để bắt thêm thẻ cùng tên
        hoặc cùng hook trong bài viết.
      </p>
      {moreRunning.length === 0 ? (
        <p className="muted">Chưa có tên / nội dung ads để sinh thêm cành. Lưu vài thẻ rồi quay lại.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Tên / từ khóa</th>
              <th>Ngành</th>
              <th>Nhóm</th>
              <th>Phủ</th>
              <th>SP khớp</th>
            </tr>
          </thead>
          <tbody>
            {moreRunning.map((row) => (
              <BranchRow key={row.id} row={row} opened={Boolean(opened[row.id])} onOpen={markOpened} />
            ))}
          </tbody>
        </table>
      )}

      <h2>Sản phẩm đang chạy ads — mở lại Thư viện</h2>
      <p className="muted">
        Tên cụm bạn đã lưu, đang có bài active. Mở search cùng tên để bắt thêm thẻ / page khác. Không
        phải tổng ads Facebook.
      </p>
      {running.length === 0 ? (
        <p className="muted">Chưa có sản phẩm đang chạy trong dữ liệu đã lưu.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Tên sản phẩm đã lưu</th>
              <th>Ngành</th>
              <th>Nhóm</th>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {running.map((row) => (
              <BranchRow key={row.id} row={row} opened={Boolean(opened[row.id])} onOpen={markOpened} />
            ))}
          </tbody>
        </table>
      )}

      <h2>Từ khóa trong bài ads đã lưu ({copies.length})</h2>
      <p className="muted">Cụm 2–3 từ lấy từ title/body ads active đã lưu — không scrape Facebook.</p>
      {copies.length === 0 ? (
        <p className="muted">Chưa có nội dung ads đủ để rút từ khóa, hoặc mọi cụm đã nằm trong catalog.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Từ khóa trong bài</th>
              <th>Ngành</th>
              <th>Nhóm</th>
              <th></th>
              <th>Bài chứa cụm</th>
            </tr>
          </thead>
          <tbody>
            {copies.slice(0, 60).map((row) => (
              <BranchRow key={row.id} row={row} opened={Boolean(opened[row.id])} onOpen={markOpened} />
            ))}
          </tbody>
        </table>
      )}

      <h2>Biến thể tên sản phẩm đang chạy ({variants.length})</h2>
      {variants.length === 0 ? (
        <p className="muted">Chưa có sản phẩm đang chạy để tách tên.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Biến thể tên</th>
              <th>Ngành</th>
              <th>Nhóm</th>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {variants.slice(0, 60).map((row) => (
              <BranchRow key={row.id} row={row} opened={Boolean(opened[row.id])} onOpen={markOpened} />
            ))}
          </tbody>
        </table>
      )}

      <h2>Toàn bộ hàng đợi catalog ({filtered.length}/{plan.totalBranches})</h2>
      <table>
        <thead>
          <tr>
            <th></th>
            <th>Cành từ khóa</th>
            <th>Ngành</th>
            <th>Nhóm</th>
            <th>Phủ</th>
            <th>SP khớp</th>
          </tr>
        </thead>
        <tbody>
          {filtered.slice(0, 400).map((row) => (
            <BranchRow key={row.id} row={row} opened={Boolean(opened[row.id])} onOpen={markOpened} />
          ))}
        </tbody>
      </table>
      {filtered.length > 400 ? <p className="muted">Đang hiện 400 / {filtered.length} — thu hẹp bộ lọc để xem hết.</p> : null}

      <h2>Nhập sheet sau khi tự ghi từ Thư viện</h2>
      <SheetImportForm />
    </div>
  );
}
