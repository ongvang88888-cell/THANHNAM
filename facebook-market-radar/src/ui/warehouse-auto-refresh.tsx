"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const DEFAULT_MS = 30_000;

export function WarehouseAutoRefresh({ intervalMs = DEFAULT_MS }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    };
    const id = window.setInterval(tick, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs, router]);
  return (
    <p className="muted">
      Tự tính lại từ kho mỗi {Math.round(intervalMs / 1000)} giây khi tab đang mở — không crawl Facebook,
      Google, YouTube hay sàn.
    </p>
  );
}
