"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiGet, apiPost, type AccessDecision } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type LessonPayload = {
  id: string;
  title: string;
  access: AccessDecision;
  contents: Array<{ id: string; contentType: string; body?: string | null }>;
};

export default function LearnPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const { token } = useAuth();
  const router = useRouter();
  const [lesson, setLesson] = useState<LessonPayload | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!token) {
      router.push("/login");
      return;
    }
    const data = await apiGet<LessonPayload>(`/lessons/${lessonId}`, token);
    setLesson(data);
  }

  useEffect(() => {
    load().catch((e) => setMsg(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, token]);

  async function watchAd() {
    if (!token || !lesson) return;
    setBusy(true);
    setMsg(null);
    try {
      const elig = await apiPost<{
        eligible: boolean;
        reason?: string;
        rewardSessionId?: string;
        durationHours?: number;
      }>(
        "/rewards/eligibility",
        {
          resourceType: "lesson",
          resourceId: lesson.id,
          policyCode: "lesson_unlock_24h",
        },
        token,
      );
      if (!elig.eligible || !elig.rewardSessionId) {
        setMsg(`Không đủ điều kiện xem quảng cáo: ${elig.reason}`);
        return;
      }
      setMsg(
        `Bạn sẽ xem 1 quảng cáo để mở bài này trong ${elig.durationHours ?? 24} giờ (demo: mô phỏng SSV).`,
      );
      await apiPost("/rewards/dev/complete", { rewardSessionId: elig.rewardSessionId }, token);
      await load();
      setMsg("Đã mở khóa bằng rewarded ad (đã xác minh server-side).");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Reward failed");
    } finally {
      setBusy(false);
    }
  }

  if (!lesson) return <p className="muted">{msg || "Loading..."}</p>;
  const access = lesson.access;

  return (
    <section className="panel">
      <h1 style={{ fontFamily: "var(--font-display)", marginTop: 0 }}>{lesson.title}</h1>
      <div>
        {access.code === "CAN_ACCESS" && <span className="badge free">CAN ACCESS</span>}
        {access.code === "NEEDS_PURCHASE" && <span className="badge paid">NEEDS PURCHASE</span>}
        {access.code === "NEEDS_AD" && <span className="badge ad">NEEDS AD</span>}
        {access.code === "CANNOT_ACCESS" && <span className="badge locked">LOCKED</span>}
      </div>

      {access.code !== "CAN_ACCESS" && (
        <div style={{ marginTop: 18 }}>
          <p className="muted">
            Nội dung đang khóa. Lý do: <strong>{access.code}</strong>
            {access.reasons?.length ? ` (${access.reasons.join(", ")})` : ""}
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {(access.code === "NEEDS_PURCHASE" || access.reasons?.some((r) => r.includes("reward"))) && (
              <a className="btn" href="/">
                Mua khóa học
              </a>
            )}
            <button className="secondary" disabled={busy} onClick={watchAd}>
              {busy ? "..." : "Xem quảng cáo để mở"}
            </button>
          </div>
          <p className="muted" style={{ marginTop: 10 }}>
            Quảng cáo sẽ mở bài học tạm thời theo policy — không phải nội dung học.
          </p>
        </div>
      )}

      {access.code === "CAN_ACCESS" && (
        <div style={{ marginTop: 20 }}>
          {lesson.contents.map((c) => (
            <article key={c.id} style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
              {c.body}
            </article>
          ))}
          {access.expiresAt && (
            <p className="muted">Quyền tạm thời hết hạn: {new Date(access.expiresAt).toLocaleString()}</p>
          )}
        </div>
      )}

      {msg && <p className="ok">{msg}</p>}
    </section>
  );
}
