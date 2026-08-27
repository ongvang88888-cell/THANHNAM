"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";
import { GplxCrumb } from "@/components/gplx/GplxChrome";

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
  { id: "wrong", label: "Hay sai" },
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
    <div className="gx-page">
      <GplxCrumb licenseClass={licenseClass} trail={[{ label: "Flashcard" }]} />
      <h1 style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.03em", marginTop: 0 }}>
        Flashcard
      </h1>
      <p className="muted">Chạm để lật — ôn nhanh biển báo và câu hỏi.</p>
      <div className="gx-class-bar" style={{ marginBottom: 16 }}>
        {KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            className={`gx-chip${kind === k.id ? " on" : ""}`}
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
            className={`gx-flash${flipped ? " flipped" : ""}`}
            onClick={() => setFlipped((f) => !f)}
            aria-label="Lật thẻ"
          >
            <div className="gx-flash-inner">
              <div className="gx-flash-face">
                <p className="muted" style={{ marginTop: 0 }}>
                  {card.kind} · {idx + 1}/{cards.length}
                </p>
                <p style={{ fontSize: "1.2rem", lineHeight: 1.5, fontWeight: 700, margin: 0 }}>
                  {card.front}
                </p>
              </div>
              <div className="gx-flash-face back">
                <p className="muted" style={{ marginTop: 0 }}>
                  Đáp án / giải thích
                </p>
                <p style={{ fontSize: "1.15rem", lineHeight: 1.55, margin: 0 }}>{card.back}</p>
              </div>
            </div>
          </button>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
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
    </div>
  );
}
