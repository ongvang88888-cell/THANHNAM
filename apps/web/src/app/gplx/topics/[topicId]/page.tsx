"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";
import { GplxCrumb } from "@/components/gplx/GplxChrome";
import { GplxFigure } from "@/components/gplx/GplxFigure";

type Q = {
  id: string;
  stem: string;
  explanation: string;
  isCritical: boolean;
  imageUrl?: string | null;
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
  const [shake, setShake] = useState(false);

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
      if (!res.correct) {
        setShake(true);
        window.setTimeout(() => setShake(false), 450);
      }
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
        <a href={`/gplx?licenseClass=${licenseClass}`}>← Về Đậu GPLX</a>
      </section>
    );
  }

  return (
    <div className="gx-page">
      <GplxCrumb
        licenseClass={licenseClass}
        trail={[{ label: data.topic.title }]}
      />
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.45rem", margin: 0 }}>
          Câu {idx + 1}/{data.questions.length}
          {q.isCritical ? " · Liệt" : ""}
        </h1>
        <div className="gx-progress-ring" style={{ width: 48, height: 48 }}>
          <svg viewBox="0 0 72 72" width="48" height="48" aria-hidden>
            <circle className="track" cx="36" cy="36" r="30" />
            <circle
              className="value"
              cx="36"
              cy="36"
              r="30"
              style={{
                strokeDasharray: 188,
                strokeDashoffset: 188 - ((idx + 1) / data.questions.length) * 188,
                animation: "none",
              }}
            />
          </svg>
        </div>
      </div>
      <div
        className="panel"
        style={{
          marginTop: 16,
          transform: shake ? "translateX(0)" : undefined,
          animation: shake ? "pulseUrgent 0.4s ease" : "rise 0.35s var(--ease-out) both",
        }}
      >
        <p style={{ fontSize: "1.08rem", lineHeight: 1.55, fontWeight: 600 }}>{q.stem}</p>
        <GplxFigure src={q.imageUrl} alt="Minh họa câu hỏi" size="lg" />
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
          <button type="button" className="secondary" onClick={() => void bookmark()}>
            {bookmarked ? "Đã bookmark" : "Bookmark"}
          </button>
          {!feedback ? (
            <button type="button" onClick={() => void check()} disabled={busy || !selected.length}>
              {busy ? "Đang chấm…" : "Kiểm tra"}
            </button>
          ) : (
            <>
              <span className={feedback.correct ? "ok" : "error"} style={{ fontWeight: 700, alignSelf: "center" }}>
                {feedback.correct ? "Chính xác!" : "Chưa đúng"}
              </span>
              <button type="button" onClick={next} disabled={idx >= data.questions.length - 1}>
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
      {error && <p className="error">{error}</p>}
    </div>
  );
}

export default function GplxTopicPage() {
  return (
    <Suspense fallback={<p className="muted">Đang tải…</p>}>
      <TopicPracticeInner />
    </Suspense>
  );
}
