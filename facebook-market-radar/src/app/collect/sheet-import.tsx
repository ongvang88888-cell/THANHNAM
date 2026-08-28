"use client";

import { useState } from "react";
import { collectJsonHeaders } from "@/ui/collect-headers";
import { CollectKeyField } from "@/ui/collect-key-field";

export function SheetImportForm() {
  const [csv, setCsv] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);
    const response = await fetch("/api/collect/sheet", {
      method: "POST",
      headers: collectJsonHeaders(),
      body: JSON.stringify({ csv }),
    });
    const json = (await response.json()) as {
      error?: string;
      imported?: number;
      skipped?: number;
      failed?: number;
      errors?: string[];
    };
    setPending(false);
    if (!response.ok) {
      setError(json.error ?? "Không nhập được sheet");
      return;
    }
    const extra = json.errors?.length ? ` · ${json.errors.slice(0, 3).join(" · ")}` : "";
    setMessage(
      `Đã nhập ${json.imported ?? 0} thẻ (bỏ ${json.skipped ?? 0}, lỗi ${json.failed ?? 0})${extra}`,
    );
  }

  return (
    <form className="stack" onSubmit={(event) => void onSubmit(event)}>
      <p className="muted">
        Dán CSV theo template <code>docs/v0/ad-library-sheet.template.csv</code>: libraryId, pageId,
        pageName, productTitle, startDate. Cột thêm: lazadaSold, tikiSold, sendoSold, googleAdsSeen,
        youtubeAdsSeen, tiktokAdsSeen, youtubeViews. Máy chủ không đọc Facebook / sàn — chỉ lưu dòng bạn dán.
      </p>
      <CollectKeyField />
      <label>
        CSV (tối đa 200 dòng)
        <textarea
          rows={8}
          value={csv}
          onChange={(event) => setCsv(event.target.value)}
          placeholder="libraryId,pageId,pageName,productTitle,startDate,nicheSlug"
        />
      </label>
      <button type="submit" disabled={pending || csv.trim().length === 0}>
        {pending ? "Đang nhập…" : "Nhập sheet"}
      </button>
      {error ? <p className="err">{error}</p> : null}
      {message ? <p className="ok">{message}</p> : null}
    </form>
  );
}
