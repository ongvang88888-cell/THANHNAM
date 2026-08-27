"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";
import { GplxCrumb } from "@/components/gplx/GplxChrome";

type Q = {
  id: string;
  stem: string;
  explanation: string;
  isCritical: boolean;
  topicTitle?: string;
  answers: Array<{ id: string; body: string }>;
};

function CriticalInner() {
  const search = useSearchParams();
  const licenseClass = search.get("licenseClass") || "B";
  const { token, ready } = useRequireAuth();
  const [questions, setQuestions] = useState<Q[]>([]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{
    correct: boolean;
    explanation: string;
    correctAnswerIds: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !token) return;
    apiGet<{ questions: Q[] }>(`/gplx/critical?licenseClass=${licenseClass}`, token)
      .then((r) => {
        setQuestions(r.questions);
        setIdx(0);
        setSelected([]);
        setFeedback(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Lỗi"));
  }, [ready, token, licenseClass]);

  const q = questions[idx];

  async function check() {
    if (!token || !q || !selected.length) return;
    try {
      const res = await apiPost<{
        correct: boolean;
        explanation: string;
        correctAnswerIds: string[];
      }>("/gplx/practice/answer", { questionId: q.id, selectedAnswerIds: selected }, token);
      setFeedback(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi");
    }
  }

  if (!q && !error) return <p className="muted">Đang tải câu điểm liệt…</p>;

  return (
    <div className="gx-page">
      <GplxCrumb licenseClass={licenseClass} trail={[{ label: "Câu điểm liệt" }]} />
      <h1 style={{ fontFamily: "var(--font-display)", letterSpacing: "0", marginTop: 0 }}>
        Câu điểm liệt
      </h1>
      <p className="muted">Sai một câu điểm liệt trong bài thi thử = không đạt.</p>
      {error && <p className="error">{error}</p>}
      {!q ? (
        <p>Chưa có câu điểm liệt cho hạng này.</p>
      ) : (
        <div className="panel">
          <p className="muted">
            {idx + 1}/{questions.length}
            {q.topicTitle ? ` · ${q.topicTitle}` : ""}
          </p>
          <p style={{ fontSize: "1.05rem", fontWeight: 600 }}>{q.stem}</p>
          <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
            {q.answers.map((a) => {
              const on = selected.includes(a.id);
              const showCorrect = feedback && feedback.correctAnswerIds.includes(a.id);
              const showWrong = feedback && on && !feedback.correct;
              return (
                <button
                  key={a.id}
                  type="button"
                  className={[
                    "gx-answer",
                    on ? "on" : "",
                    showCorrect ? "correct" : "",
                    showWrong ? "wrong" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  disabled={!!feedback}
                  onClick={() => setSelected([a.id])}
                >
                  {a.body}
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
            {!feedback ? (
              <button type="button" onClick={() => void check()} disabled={!selected.length}>
                Kiểm tra
              </button>
            ) : (
              <>
                <span
                  className={feedback.correct ? "ok" : "error"}
                  style={{ fontWeight: 700, alignSelf: "center" }}
                >
                  {feedback.correct ? "Đúng" : "Sai"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setFeedback(null);
                    setSelected([]);
                    setIdx((i) => Math.min(i + 1, questions.length - 1));
                  }}
                  disabled={idx >= questions.length - 1}
                >
                  Câu tiếp
                </button>
              </>
            )}
          </div>
          {feedback?.explanation && (
            <p className="muted" style={{ marginBottom: 0, marginTop: 12 }}>
              {feedback.explanation}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function GplxCriticalPage() {
  return (
    <Suspense fallback={<p className="muted">Đang tải…</p>}>
      <CriticalInner />
    </Suspense>
  );
}
