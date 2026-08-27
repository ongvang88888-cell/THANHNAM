"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";

type Q = {
  id: string;
  stem: string;
  explanation: string;
  isCritical: boolean;
  topicTitle: string;
  wrongCount: number;
  answers: Array<{ id: string; body: string }>;
};

export default function GplxHardestPage() {
  const { token, ready } = useRequireAuth();
  const [licenseClass, setLicenseClass] = useState("B");
  const [items, setItems] = useState<Q[]>([]);
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("licenseClass");
    if (q) setLicenseClass(q);
  }, []);

  useEffect(() => {
    if (!ready || !token) return;
    apiGet<{ questions?: Q[]; items?: Q[] }>(
      `/gplx/hardest?licenseClass=${licenseClass}`,
      token,
    )
      .then((res) => setItems(res.questions ?? res.items ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : "Lỗi"));
  }, [ready, token, licenseClass]);

  async function answer(qid: string) {
    if (!token) return;
    const res = await apiPost<{ correct: boolean; explanation: string }>(
      "/gplx/practice/answer",
      { questionId: qid, selectedAnswerIds: selected[qid] ?? [] },
      token,
    );
    setFeedback((f) => ({
      ...f,
      [qid]: res.correct ? "Đúng" : `Sai. ${res.explanation}`,
    }));
  }

  if (!ready) return <p className="muted">Đang tải…</p>;

  return (
    <section>
      <p className="muted">
        <a href={`/gplx?licenseClass=${licenseClass}`}>← GPLX</a>
      </p>
      <h1 style={{ fontFamily: "var(--font-display)" }}>Top câu hay sai</h1>
      <p className="muted">Ưu tiên ôn lại các câu bạn đã sai nhiều lần nhất.</p>
      {error && <p className="error">{error}</p>}
      {items.length === 0 && !error && (
        <p className="muted">Chưa có dữ liệu — hãy làm bài tập / thi thử trước.</p>
      )}
      {items.map((q) => (
        <div className="panel" key={q.id} style={{ marginBottom: 12 }}>
          <p className="muted">
            Sai {q.wrongCount} lần · {q.topicTitle}
            {q.isCritical ? " · Liệt" : ""}
          </p>
          <p>{q.stem}</p>
          <ul className="lesson-list">
            {q.answers.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  className={(selected[q.id] ?? []).includes(a.id) ? "" : "secondary"}
                  onClick={() => setSelected((s) => ({ ...s, [q.id]: [a.id] }))}
                >
                  {a.body}
                </button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => void answer(q.id)}>
            Kiểm tra
          </button>
          {feedback[q.id] && <p className="muted">{feedback[q.id]}</p>}
        </div>
      ))}
    </section>
  );
}
