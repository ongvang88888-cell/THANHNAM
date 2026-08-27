"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";

type Q = {
  id: string;
  stem: string;
  explanation: string;
  isCritical: boolean;
  answers: Array<{ id: string; body: string }>;
};

type Payload = {
  topic: { id: string; code: string; title: string };
  licenseClass: string;
  questions: Q[];
};

function TopicPracticeInner() {
  const { topicId } = useParams<{ topicId: string }>();
  const search = useSearchParams();
  const licenseClass = search.get("licenseClass") || "B";
  const { token, ready } = useRequireAuth();
  const [data, setData] = useState<Payload | null>(null);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{
    correct: boolean;
    explanation: string;
    correctAnswerIds: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    if (!ready || !token) return;
    apiGet<Payload>(
      `/gplx/topics/${topicId}/questions?licenseClass=${licenseClass}`,
      token,
    )
      .then((p) => {
        setData(p);
        setIdx(0);
        setSelected([]);
        setFeedback(null);
        setBookmarked(false);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Lỗi"));
  }, [ready, token, topicId, licenseClass]);

  const q = data?.questions[idx];

  async function check() {
    if (!token || !q || selected.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiPost<{
        correct: boolean;
        explanation: string;
        correctAnswerIds: string[];
      }>("/gplx/practice/answer", { questionId: q.id, selectedAnswerIds: selected }, token);
      setFeedback(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không chấm được");
    } finally {
      setBusy(false);
    }
  }

  async function bookmark() {
    if (!token || !q) return;
    try {
      await apiPost("/gplx/bookmarks", { questionId: q.id }, token);
      setBookmarked(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không bookmark được");
    }
  }

  function next() {
    setFeedback(null);
    setSelected([]);
    setBookmarked(false);
    setIdx((i) => Math.min(i + 1, (data?.questions.length ?? 1) - 1));
  }

  if (!data) return <p className="muted">{error || "Đang tải…"}</p>;
  if (!q) {
    return (
      <section>
        <p>Chưa có câu hỏi cho hạng {licenseClass} trong chuyên đề này.</p>
        <a href={`/gplx?licenseClass=${licenseClass}`}>← Về GPLX</a>
      </section>
    );
  }

  return (
    <section>
      <p className="muted">
        <a href={`/gplx?licenseClass=${licenseClass}`}>Ôn GPLX</a> · {data.topic.title} · hạng{" "}
        {licenseClass}
      </p>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem" }}>
        Câu {idx + 1}/{data.questions.length}
        {q.isCritical ? " · Điểm liệt" : ""}
      </h1>
      <div className="panel">
        <p style={{ fontSize: "1.05rem", lineHeight: 1.5 }}>{q.stem}</p>
        <ul className="lesson-list">
          {q.answers.map((a) => {
            const on = selected.includes(a.id);
            const showCorrect = feedback && feedback.correctAnswerIds.includes(a.id);
            const showWrong = feedback && on && !feedback.correct;
            return (
              <li key={a.id}>
                <button
                  type="button"
                  className={on ? "" : "secondary"}
                  disabled={!!feedback}
                  onClick={() => setSelected([a.id])}
                  style={{
                    borderColor: showCorrect
                      ? "var(--ok)"
                      : showWrong
                        ? "var(--danger)"
                        : undefined,
                  }}
                >
                  {a.body}
                </button>
              </li>
            );
          })}
        </ul>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          <button type="button" className="secondary" onClick={() => void bookmark()}>
            {bookmarked ? "Đã bookmark" : "Bookmark"}
          </button>
        </div>
        {!feedback ? (
          <button type="button" onClick={() => void check()} disabled={busy || !selected.length}>
            {busy ? "Đang chấm…" : "Kiểm tra"}
          </button>
        ) : (
          <div style={{ marginTop: 12 }}>
            <p className={feedback.correct ? "ok" : "error"}>
              {feedback.correct ? "Đúng" : "Sai"}
            </p>
            {feedback.explanation && <p className="muted">{feedback.explanation}</p>}
            <button type="button" onClick={next} disabled={idx >= data.questions.length - 1}>
              Câu tiếp
            </button>
          </div>
        )}
      </div>
      {error && <p className="error">{error}</p>}
    </section>
  );
}

export default function GplxTopicPage() {
  return (
    <Suspense fallback={<p className="muted">Đang tải…</p>}>
      <TopicPracticeInner />
    </Suspense>
  );
}
