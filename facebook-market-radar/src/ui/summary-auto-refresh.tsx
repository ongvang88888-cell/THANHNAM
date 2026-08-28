"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { collectJsonHeaders } from "@/ui/collect-headers";

const CHECK_MS = 60_000;

export function SummaryAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      if (document.visibilityState !== "visible") {
        return;
      }
      try {
        const statusRes = await fetch("/api/summary");
        const status: unknown = await statusRes.json();
        const due =
          typeof status === "object" &&
          status !== null &&
          "due" in status &&
          (status as { due: unknown }).due === true;
        if (!due || cancelled) {
          return;
        }
        const refreshRes = await fetch("/api/summary/refresh", {
          method: "POST",
          headers: collectJsonHeaders(),
          body: "{}",
        });
        if (refreshRes.ok && !cancelled) {
          router.refresh();
        }
      } catch {
        /* fail-open: next check or systemd timer */
      }
    };
    void tick();
    const id = window.setInterval(() => {
      void tick();
    }, CHECK_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [router]);

  return (
    <p className="muted">
      Tự ghi bảng tổng hợp mỗi 6 giờ (API chính thức nếu có khóa + snapshot kho). Không crawl Facebook,
      Google, YouTube hay sàn. Ô trống = chưa nhập / chưa khóa API.
    </p>
  );
}
