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
  wrongCount?: number;
  answers: Array<{ id: string; body: string }>;
};

function WrongInner() {
  const search = useSearchParams();
  const licenseClass = search.get("licenseClass") || "B";
  const { token, ready } = useRequireAuth();
  const [questions, setQuestions] = useState<Q[]>([]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{
    correct: boolean;
    explanation: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reload() {
    if (!token) return;
    apiGet<{ questions: Q[] }>(`/gplx/wrong?licenseClass=${licenseClass}`, token)
      .then((r) => {
        setQuestions(r.questions);
        setIdx(0);
        setSelected([]);
        setFeedback(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Lỗi"));
  }

  useEffect(() => {
    if (!ready || !token) return;
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, token, licenseClass]);

  const q = questions[idx];

  async function check() {
    if (!token || !q || !selected.length) return;
    try {
      const res = await apiPost<{ correct: boolean; explanation: string }>(
        "/gplx/practice/answer",
        { questionId: q.id, selectedAnswerIds: selected },
        token,
      );
      setFeedback(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi");
    }
  }

  return (
    <section>
      <p className="muted">
        <a href={`/gplx?licenseClass=${licenseClass}`}>Ôn GPLX</a> · Câu hay sai · hạng{" "}
        {licenseClass}
      </p>
      <h1 style={{ fontFamily: "var(--font-display)" }}>Ôn câu hay sai</h1>
      {error && <p className="error">{error}</p>}
      {!q ? (
        <p className="muted">Chưa có câu đánh dấu sai. Hãy làm bài ôn hoặc thi thử trước.</p>
      ) : (
        <div className="panel">
          <p className="muted">
            {idx + 1}/{questions.length}
            {q.wrongCount ? ` · đã sai ${q.wrongCount} lần` : ""}
            {q.isCritical ? " · điểm liệt" : ""}
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
                  if (idx >= questions.length - 1) reload();
                  else setIdx((i) => i + 1);
                }}
              >
                Tiếp tục
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}

export default function GplxWrongPage() {
  return (
    <Suspense fallback={<p className="muted">Đang tải…</p>}>
      <WrongInner />
    </Suspense>
  );
}
