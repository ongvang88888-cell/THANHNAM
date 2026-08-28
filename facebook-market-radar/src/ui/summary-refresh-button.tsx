"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { collectJsonHeaders } from "@/ui/collect-headers";

export function SummaryRefreshButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <span className="summary-refresh">
      <button
        type="button"
        className="btn"
        disabled={busy}
        onClick={() => {
          void (async () => {
            setBusy(true);
            setMessage(null);
            try {
              const res = await fetch("/api/summary/refresh", {
                method: "POST",
                headers: collectJsonHeaders(),
                body: "{}",
              });
              const body: unknown = await res.json().catch(() => ({}));
              if (!res.ok) {
                const error =
                  typeof body === "object" &&
                  body !== null &&
                  "error" in body &&
                  typeof (body as { error: unknown }).error === "string"
                    ? (body as { error: string }).error
                    : "Không cập nhật được";
                setMessage(error);
                return;
              }
              setMessage("Đã ghi bảng từ kho.");
              router.refresh();
            } catch {
              setMessage("Không cập nhật được");
            } finally {
              setBusy(false);
            }
          })();
        }}
      >
        {busy ? "Đang ghi…" : "Cập nhật ngay"}
      </button>
      {message ? <span className="muted"> {message}</span> : null}
    </span>
  );
}
