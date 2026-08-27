"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";
import { GplxCrumb } from "@/components/gplx/GplxChrome";

type Question = {
  id: string;
  stem: string;
  isCritical: boolean;
  answers: Array<{ id: string; body: string }>;
};

type LiveAttempt = {
  attemptId: string;
  licenseClass: string;
  submitted: false;
  mode?: string;
  rules: { questionCount: number; passCorrectCount: number; durationSec: number };
  startedAt: string;
  expiresAt: string;
  questions: Question[];
};

type DoneAttempt = {
  attemptId: string;
  licenseClass: string;
  submitted: true;
  score: number;
  correctCount: number;
  total: number;
  passed: boolean;
  failedCritical: boolean;
  detail: {
    timedOut?: boolean;
    review?: Array<{
      questionId: string;
      stem: string;
      explanation: string;
      isCritical: boolean;
      correct: boolean;
      selectedAnswerIds: string[];
      correctAnswerIds: string[];
      answers: Array<{ id: string; body: string; isCorrect: boolean }>;
    }>;
  };
};

type SubmitResult = {
  attemptId: string;
  licenseClass: string;
  score: number;
  correctCount: number;
  total: number;
  passed: boolean;
  failedCritical: boolean;
  timedOut: boolean;
  passCorrectCount: number;
  review: NonNullable<DoneAttempt["detail"]["review"]>;
};

export default function GplxExamPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const { token, ready } = useRequireAuth();
  const [live, setLive] = useState<LiveAttempt | null>(null);
  const [result, setResult] = useState<SubmitResult | DoneAttempt | null>(null);
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [idx, setIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [enterKey, setEnterKey] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!ready || !token) return;
    apiGet<LiveAttempt | DoneAttempt>(`/gplx/mock/${attemptId}`, token)
      .then((res) => {
        if (res.submitted) {
          setResult(res);
          setLive(null);
        } else {
          setLive(res);
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Lỗi"));
  }, [ready, token, attemptId]);

  const remainSec = useMemo(() => {
    if (!live) return 0;
    return Math.max(0, Math.floor((new Date(live.expiresAt).getTime() - now) / 1000));
  }, [live, now]);

  const submit = useCallback(async () => {
    if (!token || !live) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiPost<SubmitResult>(
        `/gplx/mock/${live.attemptId}/submit`,
        {
          answers: live.questions.map((q) => ({
            questionId: q.id,
            selectedAnswerIds: selected[q.id] ?? [],
          })),
        },
        token,
      );
      setResult(res);
      setLive(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nộp bài thất bại");
    } finally {
      setBusy(false);
    }
  }, [token, live, selected]);

  useEffect(() => {
    if (live && remainSec === 0 && !busy && !result) {
      void submit();
    }
  }, [live, remainSec, busy, result, submit]);

  useEffect(() => {
    setEnterKey((k) => k + 1);
  }, [idx]);

  if (error && !live && !result) return <p className="error">{error}</p>;

  if (result) {
    const review =
      "review" in result
        ? result.review
        : result.submitted
          ? result.detail.review
          : undefined;
    const timedOut =
      "timedOut" in result
        ? result.timedOut
        : result.submitted
          ? !!result.detail.timedOut
          : false;
    const passNeed =
      "passCorrectCount" in result ? result.passCorrectCount : undefined;

    return (
      <div className="gx-page">
        <GplxCrumb licenseClass={result.licenseClass} trail={[{ label: "Kết quả" }]} />
        <div
          className="panel"
          style={{
            textAlign: "center",
            padding: "36px 24px",
            background: result.passed
              ? "linear-gradient(160deg, rgba(15,159,110,0.16), rgba(255,255,255,0.92))"
              : "linear-gradient(160deg, rgba(192,57,43,0.12), rgba(255,255,255,0.92))",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2rem, 6vw, 3rem)",
              margin: "0 0 8px",
              letterSpacing: "0",
              color: result.passed ? "var(--ok)" : "var(--danger)",
              animation: "brandPop 0.7s var(--ease-out) both",
            }}
          >
            {result.passed ? "ĐẠT" : "CHƯA ĐẠT"}
          </p>
          <p style={{ fontSize: "1.2rem", margin: "0 0 8px" }}>
            {result.correctCount}/{result.total} câu đúng
            {passNeed ? ` · cần ≥ ${passNeed}` : ""}
          </p>
          {result.failedCritical && (
            <p className="error">Trượt vì sai câu điểm liệt.</p>
          )}
          {timedOut && <p className="muted">Hết giờ — đã nộp tự động.</p>}
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 16 }}>
            <a className="btn" href={`/gplx?licenseClass=${result.licenseClass}`}>
              Về Đậu GPLX
            </a>
            <a className="btn secondary" href={`/gplx/wrong?licenseClass=${result.licenseClass}`}>
              Ôn câu sai
            </a>
          </div>
        </div>
        {review && review.length > 0 && (
          <>
            <h2 style={{ fontFamily: "var(--font-display)" }}>Xem lại</h2>
            {review.map((r, i) => (
              <div className="panel" key={r.questionId} style={{ marginBottom: 12 }}>
                <p>
                  <strong>
                    {i + 1}. {r.correct ? "Đúng" : "Sai"}
                    {r.isCritical ? " · Liệt" : ""}
                  </strong>
                </p>
                <p>{r.stem}</p>
                <ul className="lesson-list">
                  {r.answers.map((a) => (
                    <li key={a.id} className="muted">
                      {a.isCorrect ? "✓ " : ""}
                      {a.body}
                      {r.selectedAnswerIds.includes(a.id) ? " (bạn chọn)" : ""}
                    </li>
                  ))}
                </ul>
                {r.explanation && <p className="muted">{r.explanation}</p>}
              </div>
            ))}
          </>
        )}
      </div>
    );
  }

  if (!live) return <p className="muted">Đang tải đề thi…</p>;

  const q = live.questions[idx]!;
  const mm = String(Math.floor(remainSec / 60)).padStart(2, "0");
  const ss = String(remainSec % 60).padStart(2, "0");
  const answered = live.questions.filter((qq) => (selected[qq.id] ?? []).length > 0).length;
  const flaggedCount = Object.values(flagged).filter(Boolean).length;
  const urgent = remainSec < 60;

  return (
    <div className="gx-page">
      <GplxCrumb
        licenseClass={live.licenseClass}
        trail={[{ label: live.mode === "critical_only" ? "Ôn liệt" : "Thi thử" }]}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <h1 style={{ fontFamily: "var(--font-display)", margin: 0, fontSize: "1.45rem", letterSpacing: "0" }}>
          Hạng {live.licenseClass}
          {live.mode && live.mode !== "random" ? ` · ${live.mode}` : ""}
        </h1>
        <div className={`gx-timer${urgent ? " urgent" : ""}`}>
          {mm}:{ss}
        </div>
      </div>
      <p className="muted" style={{ marginTop: 0 }}>
        Đã trả lời {answered}/{live.questions.length}
        {live.mode === "critical_only"
          ? " · cần đúng hết (nếu bộ ngắn)"
          : ` · cần ≥ ${live.rules.passCorrectCount}`}
        {flaggedCount > 0 ? ` · xem lại ${flaggedCount}` : ""}
      </p>

      <div className="gx-exam-grid">
        {live.questions.map((qq, i) => {
          const isAnswered = (selected[qq.id] ?? []).length > 0;
          const isFlagged = !!flagged[qq.id];
          return (
            <button
              key={qq.id}
              type="button"
              className={[
                "gx-qbtn",
                i === idx ? "current" : "",
                isAnswered ? "answered" : "",
                isFlagged ? "flagged" : "",
                qq.isCritical ? "critical" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => setIdx(i)}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      <div
        className="panel"
        key={enterKey}
        style={{ animation: "rise 0.35s var(--ease-out) both" }}
      >
        <p className="muted" style={{ marginTop: 0 }}>
          Câu {idx + 1}
          {q.isCritical ? " · Điểm liệt" : ""}
          {flagged[q.id] ? " · Đánh dấu" : ""}
        </p>
        <p style={{ fontSize: "1.12rem", lineHeight: 1.55, fontWeight: 600 }}>{q.stem}</p>
        <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
          {q.answers.map((a) => {
            const on = (selected[q.id] ?? []).includes(a.id);
            return (
              <button
                key={a.id}
                type="button"
                className={`gx-answer${on ? " on" : ""}`}
                onClick={() => setSelected((prev) => ({ ...prev, [q.id]: [a.id] }))}
              >
                {a.body}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 18 }}>
          <button
            type="button"
            className="secondary"
            disabled={idx === 0}
            onClick={() => setIdx((i) => i - 1)}
          >
            Trước
          </button>
          <button
            type="button"
            className="secondary"
            disabled={idx >= live.questions.length - 1}
            onClick={() => setIdx((i) => i + 1)}
          >
            Sau
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => setFlagged((f) => ({ ...f, [q.id]: !f[q.id] }))}
          >
            {flagged[q.id] ? "Bỏ đánh dấu" : "Đánh dấu xem lại"}
          </button>
          <button type="button" onClick={() => void submit()} disabled={busy}>
            {busy ? "Đang nộp…" : "Nộp bài"}
          </button>
        </div>
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
