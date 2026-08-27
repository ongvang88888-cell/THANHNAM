"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";

type Card = {
  id: string;
  front: string;
  back: string;
  kind: string;
};

const KINDS = [
  { id: "mixed", label: "Hỗn hợp" },
  { id: "signs", label: "Biển báo" },
  { id: "critical", label: "Điểm liệt" },
  { id: "wrong", label: "Câu hay sai" },
] as const;

export default function GplxFlashcardsPage() {
  const { token, ready } = useRequireAuth();
  const [licenseClass, setLicenseClass] = useState("B");
  const [kind, setKind] = useState<(typeof KINDS)[number]["id"]>("mixed");
  const [cards, setCards] = useState<Card[]>([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const lc = sp.get("licenseClass");
    if (lc) setLicenseClass(lc);
    const k = sp.get("kind");
    if (k && KINDS.some((x) => x.id === k)) setKind(k as typeof kind);
  }, []);

  useEffect(() => {
    if (!ready || !token) return;
    setFlipped(false);
    setIdx(0);
    const kParam = kind === "mixed" ? "" : `&kind=${kind}`;
    apiGet<{ items: Card[] }>(
      `/gplx/flashcards?licenseClass=${licenseClass}${kParam}`,
      token,
    )
      .then((res) => setCards(res.items ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : "Lỗi"));
  }, [ready, token, licenseClass, kind]);

  if (!ready) return <p className="muted">Đang tải…</p>;

  const card = cards[idx];

  return (
    <section>
      <p className="muted">
        <a href={`/gplx?licenseClass=${licenseClass}`}>← GPLX</a>
      </p>
      <h1 style={{ fontFamily: "var(--font-display)" }}>Flashcard</h1>
      <p className="muted">Ôn nhanh biển báo và câu hỏi — lật thẻ để xem đáp án / giải thích.</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            className={kind === k.id ? "" : "secondary"}
            onClick={() => setKind(k.id)}
          >
            {k.label}
          </button>
        ))}
      </div>
      {error && <p className="error">{error}</p>}
      {!card && !error && <p className="muted">Chưa có thẻ nào.</p>}
      {card && (
        <>
          <button
            type="button"
            className="panel"
            onClick={() => setFlipped((f) => !f)}
            style={{
              width: "100%",
              minHeight: 180,
              textAlign: "left",
              cursor: "pointer",
              marginBottom: 12,
            }}
          >
            <p className="muted" style={{ marginTop: 0 }}>
              {card.kind} · {idx + 1}/{cards.length} · chạm để lật
            </p>
            <p style={{ fontSize: "1.1rem", lineHeight: 1.5 }}>
              {flipped ? card.back : card.front}
            </p>
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="secondary"
              disabled={idx === 0}
              onClick={() => {
                setIdx((i) => i - 1);
                setFlipped(false);
              }}
            >
              Trước
            </button>
            <button
              type="button"
              className="secondary"
              disabled={idx >= cards.length - 1}
              onClick={() => {
                setIdx((i) => i + 1);
                setFlipped(false);
              }}
            >
              Sau
            </button>
          </div>
        </>
      )}
    </section>
  );
}
