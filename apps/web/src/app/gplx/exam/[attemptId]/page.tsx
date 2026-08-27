"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";

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
      <section>
        <h1 style={{ fontFamily: "var(--font-display)" }}>
          Kết quả thi thử {result.licenseClass}
        </h1>
        <div className="panel">
          <p className={result.passed ? "ok" : "error"} style={{ fontSize: "1.25rem" }}>
            {result.passed ? "ĐẠT" : "CHƯA ĐẠT"} — {result.correctCount}/{result.total} câu đúng
            {passNeed ? ` (cần ≥ ${passNeed})` : ""}
          </p>
          {result.failedCritical && (
            <p className="error">Không đạt vì sai câu điểm liệt.</p>
          )}
          {timedOut && <p className="muted">Hết giờ — bài đã được nộp tự động.</p>}
          <a href={`/gplx?licenseClass=${result.licenseClass}`}>Về trang ôn GPLX</a>
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
      </section>
    );
  }

  if (!live) return <p className="muted">Đang tải đề thi…</p>;

  const q = live.questions[idx]!;
  const mm = String(Math.floor(remainSec / 60)).padStart(2, "0");
  const ss = String(remainSec % 60).padStart(2, "0");
  const answered = live.questions.filter((qq) => (selected[qq.id] ?? []).length > 0).length;
  const flaggedCount = Object.values(flagged).filter(Boolean).length;

  return (
    <section>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <h1 style={{ fontFamily: "var(--font-display)", margin: 0, fontSize: "1.35rem" }}>
          Thi thử {live.licenseClass}
          {live.mode && live.mode !== "random" ? ` · ${live.mode}` : ""}
        </h1>
        <strong style={{ color: remainSec < 60 ? "var(--danger)" : "var(--brand)" }}>
          ⏱ {mm}:{ss}
        </strong>
      </div>
      <p className="muted">
        Đã trả lời {answered}/{live.questions.length}
        {live.mode === "critical_only"
          ? " · Ôn liệt: cần đúng hết (hoặc đạt ngưỡng nếu đủ số câu)"
          : ` · Cần đúng ≥ ${live.rules.passCorrectCount}`}
        {flaggedCount > 0 ? ` · Đánh dấu xem lại: ${flaggedCount}` : ""}
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
        {live.questions.map((qq, i) => {
          const isAnswered = (selected[qq.id] ?? []).length > 0;
          const isFlagged = !!flagged[qq.id];
          return (
            <button
              key={qq.id}
              type="button"
              className={i === idx ? "" : "secondary"}
              style={{
                minWidth: 36,
                padding: "6px 8px",
                opacity: isAnswered ? 1 : 0.65,
                outline: isFlagged ? "2px solid var(--brand)" : undefined,
              }}
              onClick={() => setIdx(i)}
              title={isFlagged ? "Đã đánh dấu xem lại" : undefined}
            >
              {i + 1}
              {qq.isCritical ? "*" : ""}
              {isFlagged ? "!" : ""}
            </button>
          );
        })}
      </div>

      <div className="panel">
        <p className="muted">
          Câu {idx + 1}
          {q.isCritical ? " · Điểm liệt" : ""}
          {flagged[q.id] ? " · Xem lại" : ""}
        </p>
        <p style={{ fontSize: "1.05rem", lineHeight: 1.5 }}>{q.stem}</p>
        <ul className="lesson-list">
          {q.answers.map((a) => {
            const on = (selected[q.id] ?? []).includes(a.id);
            return (
              <li key={a.id}>
                <button
                  type="button"
                  className={on ? "" : "secondary"}
                  onClick={() =>
                    setSelected((prev) => ({ ...prev, [q.id]: [a.id] }))
                  }
                >
                  {a.body}
                </button>
              </li>
            );
          })}
        </ul>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
            onClick={() =>
              setFlagged((f) => ({ ...f, [q.id]: !f[q.id] }))
            }
          >
            {flagged[q.id] ? "Bỏ đánh dấu" : "Đánh dấu xem lại"}
          </button>
          <button type="button" onClick={() => void submit()} disabled={busy}>
            {busy ? "Đang nộp…" : "Nộp bài"}
          </button>
        </div>
      </div>
      {error && <p className="error">{error}</p>}
    </section>
  );
}
