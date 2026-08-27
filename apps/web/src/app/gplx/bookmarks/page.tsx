"use client";

import { useEffect, useState } from "react";
import { apiGet, apiDelete, apiPost } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";

type Item = {
  id: string;
  stem: string;
  explanation: string;
  isCritical: boolean;
  topicTitle: string;
  note?: string;
  answers: Array<{ id: string; body: string }>;
};

export default function GplxBookmarksPage() {
  const { token, ready } = useRequireAuth();
  const [licenseClass, setLicenseClass] = useState("B");
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});

  function load() {
    if (!token) return;
    apiGet<{ items?: Item[]; questions?: Item[] }>(
      `/gplx/bookmarks?licenseClass=${licenseClass}`,
      token,
    )
      .then((res) => setItems(res.items ?? res.questions ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : "Lỗi"));
  }

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("licenseClass");
    if (q) setLicenseClass(q);
  }, []);

  useEffect(() => {
    if (!ready || !token) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, token, licenseClass]);

  async function remove(id: string) {
    if (!token) return;
    await apiDelete(`/gplx/bookmarks/${id}`, token);
    setItems((prev) => prev.filter((x) => x.id !== id));
  }

  async function answer(qid: string) {
    if (!token) return;
    try {
      const res = await apiPost<{ correct: boolean; explanation: string }>(
        "/gplx/practice/answer",
        { questionId: qid, selectedAnswerIds: selected[qid] ?? [] },
        token,
      );
      setFeedback((f) => ({
        ...f,
        [qid]: res.correct ? "Đúng" : `Sai. ${res.explanation}`,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi");
    }
  }

  if (!ready) return <p className="muted">Đang tải…</p>;

  return (
    <section>
      <p className="muted">
        <a href={`/gplx?licenseClass=${licenseClass}`}>← GPLX</a>
      </p>
      <h1 style={{ fontFamily: "var(--font-display)" }}>Câu đã bookmark</h1>
      {error && <p className="error">{error}</p>}
      {items.length === 0 && <p className="muted">Chưa bookmark câu nào.</p>}
      {items.map((q) => (
        <div className="panel" key={q.id} style={{ marginBottom: 12 }}>
          <p>
            {q.isCritical ? "· Liệt · " : ""}
            {q.stem}
          </p>
          <p className="muted">{q.topicTitle}</p>
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
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={() => void answer(q.id)}>
              Kiểm tra
            </button>
            <button type="button" className="secondary" onClick={() => void remove(q.id)}>
              Bỏ bookmark
            </button>
          </div>
          {feedback[q.id] && <p className="muted">{feedback[q.id]}</p>}
        </div>
      ))}
    </section>
  );
}
