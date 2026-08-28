"use client";

import { useState } from "react";
import { collectJsonHeaders } from "@/ui/collect-headers";
import { CollectKeyField } from "@/ui/collect-key-field";

export function LicensedImportForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);
    const response = await fetch("/api/licensed/import", {
      method: "POST",
      headers: collectJsonHeaders(),
    });
    const json = (await response.json()) as { error?: string; imported?: number };
    setPending(false);
    if (!response.ok) {
      setError(json.error ?? "Không nhập được feed");
      return;
    }
    setMessage(`Đã nhập ${json.imported ?? 0} thẻ từ feed đã mua (nếu có file).`);
  }

  return (
    <form className="stack" onSubmit={(event) => void onSubmit(event)}>
      <CollectKeyField />
      <p className="muted">
        Chỉ đọc file JSON đã mua (`FMR_LICENSED_FEED_PATH`). Không crawl Ad Library. Nếu chưa cấu hình file,
        kết quả là 0.
      </p>
      <button type="submit" disabled={pending}>
        {pending ? "Đang nhập…" : "Nhập feed đã mua"}
      </button>
      {error ? <p className="err">{error}</p> : null}
      {message ? <p className="ok">{message}</p> : null}
    </form>
  );
}
