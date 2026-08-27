"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";

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
    <section>
      <p className="muted">
        <a href={`/gplx?licenseClass=${licenseClass}`}>Ôn GPLX</a> · Câu điểm liệt · hạng{" "}
        {licenseClass}
      </p>
      <h1 style={{ fontFamily: "var(--font-display)" }}>Câu điểm liệt</h1>
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
          <p style={{ fontSize: "1.05rem" }}>{q.stem}</p>
          <ul className="lesson-list">
            {q.answers.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  className={selected.includes(a.id) ? "" : "secondary"}
                  disabled={!!feedback}
                  onClick={() => setSelected([a.id])}
                >
                  {a.body}
                </button>
              </li>
            ))}
          </ul>
          {!feedback ? (
            <button type="button" onClick={() => void check()} disabled={!selected.length}>
              Kiểm tra
            </button>
          ) : (
            <>
              <p className={feedback.correct ? "ok" : "error"}>
                {feedback.correct ? "Đúng" : "Sai"}
              </p>
              <p className="muted">{feedback.explanation}</p>
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
      )}
    </section>
  );
}

export default function GplxCriticalPage() {
  return (
    <Suspense fallback={<p className="muted">Đang tải…</p>}>
      <CriticalInner />
    </Suspense>
  );
}
