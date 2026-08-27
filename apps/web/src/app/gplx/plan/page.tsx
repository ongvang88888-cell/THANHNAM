"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiGet } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";
import { GplxCrumb } from "@/components/gplx/GplxChrome";

type Day = {
  day: number;
  title: string;
  focus: string;
  actions: string[];
  targetMocks: number;
};

function PlanInner() {
  const search = useSearchParams();
  const licenseClass = search.get("licenseClass") || "B";
  const { token, ready } = useRequireAuth();
  const [days, setDays] = useState<Day[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !token) return;
    apiGet<{ days: Day[] }>(`/gplx/plan?licenseClass=${licenseClass}`, token)
      .then((r) => setDays(r.days))
      .catch((e) => setError(e instanceof Error ? e.message : "Lỗi"));
  }, [ready, token, licenseClass]);

  return (
    <div className="gx-page">
      <GplxCrumb licenseClass={licenseClass} trail={[{ label: "Lộ trình" }]} />
      <h1 style={{ fontFamily: "var(--font-display)", letterSpacing: "0", marginTop: 0 }}>
        Lộ trình 7 ngày
      </h1>
      <p className="muted">Kế hoạch ôn cấp tốc trước ngày sát hạch lý thuyết.</p>
      {error && <p className="error">{error}</p>}
      {days.map((d) => (
        <div className="panel" key={d.day} style={{ marginBottom: 12 }}>
          <h3
            style={{
              marginTop: 0,
              fontFamily: "var(--font-display)",
              letterSpacing: "0",
            }}
          >
            Ngày {d.day}: {d.title}
          </h3>
          <p className="muted">{d.focus}</p>
          <ul>
            {d.actions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
          {d.targetMocks > 0 && (
            <p>
              <a href={`/gplx?licenseClass=${licenseClass}`}>
                Thi thử hôm nay ({d.targetMocks} đề) →
              </a>
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

export default function GplxPlanPage() {
  return (
    <Suspense fallback={<p className="muted">Đang tải…</p>}>
      <PlanInner />
    </Suspense>
  );
}
