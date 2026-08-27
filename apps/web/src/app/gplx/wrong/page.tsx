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
    <div className="gx-page">
      <GplxCrumb licenseClass={licenseClass} trail={[{ label: "Câu hay sai" }]} />
      <h1 style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.03em", marginTop: 0 }}>
        Ôn câu hay sai
      </h1>
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
          <p style={{ fontSize: "1.05rem", fontWeight: 600 }}>{q.stem}</p>
          <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
            {q.answers.map((a) => {
              const on = selected.includes(a.id);
              const showCorrect = feedback && feedback.correct && on;
              const showWrong = feedback && !feedback.correct && on;
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
                    if (idx >= questions.length - 1) reload();
                    else setIdx((i) => i + 1);
                  }}
                >
                  Tiếp tục
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

export default function GplxWrongPage() {
  return (
    <Suspense fallback={<p className="muted">Đang tải…</p>}>
      <WrongInner />
    </Suspense>
  );
}
