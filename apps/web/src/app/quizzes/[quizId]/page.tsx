"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type QuizPayload = {
  id: string;
  title: string;
  courseId: string;
  questions: Array<{
    id: string;
    type: string;
    stem: string;
    answers: Array<{ id: string; body: string }>;
  }>;
};

export default function QuizPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const { token } = useAuth();
  const router = useRouter();
  const [quiz, setQuiz] = useState<QuizPayload | null>(null);
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [result, setResult] = useState<{
    score: number;
    passed: boolean;
    passScore: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    apiGet<QuizPayload>(`/quizzes/${quizId}`, token)
      .then(setQuiz)
      .catch((e) => setError(e.message));
  }, [quizId, token, router]);

  function toggle(qid: string, aid: string, multi: boolean) {
    setSelected((prev) => {
      const cur = prev[qid] ?? [];
      if (multi) {
        return {
          ...prev,
          [qid]: cur.includes(aid) ? cur.filter((x) => x !== aid) : [...cur, aid],
        };
      }
      return { ...prev, [qid]: [aid] };
    });
  }

  async function submit() {
    if (!token || !quiz) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiPost<{ score: number; passed: boolean; passScore: number }>(
        `/quizzes/${quiz.id}/attempts`,
        {
          answers: quiz.questions.map((q) => ({
            questionId: q.id,
            selectedAnswerIds: selected[q.id] ?? [],
          })),
        },
        token,
      );
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setBusy(false);
    }
  }

  if (!quiz) return <p className="muted">{error || "Loading quiz..."}</p>;

  return (
    <section>
      <h1 style={{ fontFamily: "var(--font-display)" }}>{quiz.title}</h1>
      <p className="muted">Chấm điểm trên server — không tin điểm từ client.</p>
      {quiz.questions.map((q, idx) => (
        <div className="panel" key={q.id} style={{ marginBottom: 16 }}>
          <h3>
            {idx + 1}. {q.stem}
          </h3>
          <ul className="lesson-list">
            {q.answers.map((a) => {
              const on = (selected[q.id] ?? []).includes(a.id);
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    className={on ? "" : "secondary"}
                    onClick={() => toggle(q.id, a.id, q.type === "multi")}
                  >
                    {a.body}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <button onClick={submit} disabled={busy}>
        {busy ? "Submitting..." : "Nộp bài"}
      </button>
      {result && (
        <p className={result.passed ? "ok" : "error"} style={{ marginTop: 16 }}>
          Điểm: {result.score}% — {result.passed ? "ĐẠT" : "CHƯA ĐẠT"} (cần{" "}
          {result.passScore}%)
        </p>
      )}
      {error && <p className="error">{error}</p>}
    </section>
  );
}
