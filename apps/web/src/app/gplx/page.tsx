"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, ApiError } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";

type Overview = {
  licenseClass: string;
  rules: {
    questionCount: number;
    passCorrectCount: number;
    durationSec: number;
    criticalFailEnabled: boolean;
  };
  isPro: boolean;
  mocksUsedToday: number;
  mocksRemainingToday: number | null;
  freeMocksPerDay: number;
  streak?: { currentStreak: number; longestStreak: number; lastStudyDate: string };
  bookmarkCount?: number;
  weakTopics?: Array<{
    topicId: string;
    topicTitle: string;
    wrongRate: number;
    wrong: number;
    attempted: number;
  }>;
  proProduct: {
    id: string;
    slug: string;
    name: string;
    price: { currency: string; amountMinor: number } | null;
  } | null;
  stats: {
    totalQuestions: number;
    criticalCount: number;
    mastered: number;
    learning: number;
    wrong: number;
    unseen: number;
  };
  topics: Array<{ id: string; code: string; title: string; questionCount: number }>;
  recentAttempts: Array<{
    id: string;
    passed: boolean;
    score: number;
    correctCount: number;
    total: number;
    failedCritical: boolean;
    mode?: string;
    startedAt: string;
    submittedAt: string | null;
  }>;
  planPreview: Array<{ day: number; title: string; focus: string }>;
};

const CLASSES = [
  "A1",
  "A",
  "B1",
  "B",
  "C1",
  "C",
  "D1",
  "D2",
  "D",
  "BE",
  "CE",
  "DE",
];
const LS_KEY = "gplx_license_class";

export default function GplxHomePage() {
  const { token, ready } = useRequireAuth();
  const [licenseClass, setLicenseClass] = useState("B");
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState<string | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(LS_KEY);
    if (saved && CLASSES.includes(saved)) setLicenseClass(saved);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(LS_KEY, licenseClass);
  }, [licenseClass]);

  useEffect(() => {
    if (!ready || !token) return;
    setError(null);
    apiGet<Overview>(`/gplx/overview?licenseClass=${licenseClass}`, token)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Lỗi tải dữ liệu"));
  }, [ready, token, licenseClass]);

  const masteryPct = useMemo(() => {
    if (!data || data.stats.totalQuestions === 0) return 0;
    return Math.round((data.stats.mastered / data.stats.totalQuestions) * 100);
  }, [data]);

  const ringOffset = useMemo(() => {
    const c = 2 * Math.PI * 30;
    return c - (masteryPct / 100) * c;
  }, [masteryPct]);

  async function startExam(mode: "random" | "critical_only" = "random") {
    if (!token) return;
    setStarting(mode);
    setError(null);
    try {
      const res = await apiPost<{ attemptId: string }>(
        "/gplx/mock/start",
        { licenseClass, mode },
        token,
      );
      window.location.href = `/gplx/exam/${res.attemptId}`;
    } catch (e) {
      if (e instanceof ApiError && e.status === 403 && data?.proProduct) {
        setError(e.message);
      } else {
        setError(e instanceof Error ? e.message : "Không bắt đầu được đề thi");
      }
      setStarting(null);
    }
  }

  if (!ready) return <p className="muted">Đang tải…</p>;

  return (
    <div className="gx-page">
      <section className="gx-hero" aria-label="Đậu GPLX">
        <div className="gx-hero-bg" aria-hidden />
        <div className="gx-hero-road" aria-hidden />
        <div className="gx-hero-content">
          <p className="gx-brand">Đậu</p>
          <h2>Ôn GPLX sống động — thi là nhớ</h2>
          <p>
            Luyện đề chuẩn thời gian, điểm liệt, flashcard biển báo và lộ trình 7 ngày. Giao diện
            tập trung, phản hồi tức thì.
          </p>
          <div className="gx-cta-row">
            <button
              type="button"
              className="btn-primary-light"
              onClick={() => void startExam("random")}
              disabled={!!starting}
            >
              {starting === "random" ? "Đang tạo đề…" : "Thi thử ngay"}
            </button>
            <a className="btn btn-ghost-light" href={`/gplx/flashcards?licenseClass=${licenseClass}`}>
              Flashcard nhanh
            </a>
          </div>
        </div>
      </section>

      <div className="panel" style={{ marginBottom: 20 }}>
        <strong>Chọn hạng bằng</strong>
        <div className="gx-class-bar">
          {CLASSES.map((c) => (
            <button
              key={c}
              type="button"
              className={`gx-chip${c === licenseClass ? " on" : ""}`}
              onClick={() => setLicenseClass(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {!data && !error && <p className="muted">Đang tải tiến độ…</p>}

      {data && (
        <>
          <div className="gx-stats">
            <div className="gx-stat" style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div
                className="gx-progress-ring"
                style={{ ["--offset" as string]: String(ringOffset) }}
              >
                <svg viewBox="0 0 72 72" width="72" height="72" aria-hidden>
                  <circle className="track" cx="36" cy="36" r="30" />
                  <circle className="value" cx="36" cy="36" r="30" />
                </svg>
                <strong style={{ fontSize: "0.95rem" }}>{masteryPct}%</strong>
              </div>
              <div>
                <div className="label">Thuộc</div>
                <strong style={{ fontSize: "1.1rem" }}>
                  {data.stats.mastered}/{data.stats.totalQuestions}
                </strong>
              </div>
            </div>
            <div className="gx-stat">
              <div className="label">Chuỗi ngày</div>
              <strong>{data.streak?.currentStreak ?? 0}</strong>
              <div className="hint">kỷ lục {data.streak?.longestStreak ?? 0}</div>
            </div>
            <div className="gx-stat">
              <div className="label">Hay sai</div>
              <strong>{data.stats.wrong}</strong>
            </div>
            <div className="gx-stat">
              <div className="label">Điểm liệt</div>
              <strong>{data.stats.criticalCount}</strong>
            </div>
            <div className="gx-stat">
              <div className="label">Bookmark</div>
              <strong>{data.bookmarkCount ?? 0}</strong>
            </div>
            <div className="gx-stat">
              <div className="label">Đề hôm nay</div>
              <strong>
                {data.isPro ? "∞" : `${data.mocksRemainingToday ?? 0}`}
              </strong>
              <div className="hint">{data.isPro ? "Pro" : `/ ${data.freeMocksPerDay} free`}</div>
            </div>
          </div>

          <div className="gx-modes">
            <button
              type="button"
              className="gx-mode"
              onClick={() => void startExam("random")}
              disabled={!!starting}
            >
              <span className="kicker">Chuẩn sát hạch · hạng {data.licenseClass}</span>
              <strong>Đề ngẫu nhiên</strong>
              <span>
                {data.rules.questionCount} câu · {Math.round(data.rules.durationSec / 60)} phút · đạt ≥
                {data.rules.passCorrectCount}/{data.rules.questionCount}
                {data.rules.criticalFailEnabled ? " · 1 câu liệt" : ""}
              </span>
            </button>
            <button
              type="button"
              className="gx-mode"
              onClick={() => void startExam("critical_only")}
              disabled={!!starting}
            >
              <span className="kicker">Ưu tiên</span>
              <strong>Chỉ điểm liệt</strong>
              <span>Drill đến khi vững — sai 1 câu là trượt</span>
            </button>
            <a className="gx-mode" href={`/gplx/sets?licenseClass=${licenseClass}`}>
              <span className="kicker">Lặp lại</span>
              <strong>Bộ đề cố định</strong>
              <span>Làm lại cùng một đề đến khi ổn định</span>
            </a>
          </div>

          <div className="gx-links">
            <a className="btn secondary" href={`/gplx/search?licenseClass=${licenseClass}`}>
              Tìm câu hỏi
            </a>
            <a className="btn secondary" href={`/gplx/bookmarks?licenseClass=${licenseClass}`}>
              Bookmark
            </a>
            <a className="btn secondary" href={`/gplx/flashcards?licenseClass=${licenseClass}`}>
              Flashcard
            </a>
            <a className="btn secondary" href={`/gplx/critical?licenseClass=${licenseClass}`}>
              Câu điểm liệt
            </a>
            <a className="btn secondary" href={`/gplx/wrong?licenseClass=${licenseClass}`}>
              Câu hay sai
            </a>
            <a className="btn secondary" href={`/gplx/hardest?licenseClass=${licenseClass}`}>
              Top khó
            </a>
            <a className="btn secondary" href="/gplx/tips">
              Mẹo
            </a>
            <a className="btn secondary" href="/gplx/signs">
              Biển báo
            </a>
            <a className="btn secondary" href={`/gplx/plan?licenseClass=${licenseClass}`}>
              Lộ trình 7 ngày
            </a>
            {!data.isPro && data.proProduct && (
              <a className="btn" href={`/products/${data.proProduct.slug}`}>
                Nâng cấp Pro
              </a>
            )}
          </div>

          {data.weakTopics && data.weakTopics.length > 0 && (
            <div className="panel" style={{ marginBottom: 20 }}>
              <h2 style={{ marginTop: 0, fontFamily: "var(--font-display)" }}>Chuyên đề cần vá</h2>
              <ul className="lesson-list">
                {data.weakTopics.map((t) => (
                  <li key={t.topicId}>
                    <a href={`/gplx/topics/${t.topicId}?licenseClass=${licenseClass}`}>
                      {t.topicTitle}
                    </a>
                    <span className="muted">
                      sai {Math.round(t.wrongRate * 100)}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <h2 style={{ fontFamily: "var(--font-display)" }}>Học theo chuyên đề</h2>
          <ul className="lesson-list">
            {data.topics.map((t, i) => (
              <li
                key={t.id}
                style={{ animation: `rise 0.5s var(--ease-out) ${0.04 * i}s both` }}
              >
                <a href={`/gplx/topics/${t.id}?licenseClass=${licenseClass}`}>
                  {t.title}
                </a>
                <span className="muted">{t.questionCount} câu</span>
              </li>
            ))}
          </ul>

          {data.planPreview?.length > 0 && (
            <div className="panel" style={{ marginTop: 20 }}>
              <h2 style={{ marginTop: 0, fontFamily: "var(--font-display)" }}>Lộ trình nhanh</h2>
              <ul className="lesson-list">
                {data.planPreview.map((d) => (
                  <li key={d.day}>
                    <span>
                      Ngày {d.day}: {d.title}
                    </span>
                    <span className="muted">{d.focus}</span>
                  </li>
                ))}
              </ul>
              <a href={`/gplx/plan?licenseClass=${licenseClass}`}>Xem đủ 7 ngày →</a>
            </div>
          )}

          {data.recentAttempts.length > 0 && (
            <>
              <h2 style={{ fontFamily: "var(--font-display)" }}>Lịch sử gần đây</h2>
              <ul className="lesson-list">
                {data.recentAttempts.map((a) => (
                  <li key={a.id}>
                    <a href={`/gplx/exam/${a.id}`}>
                      {a.submittedAt
                        ? `${a.passed ? "ĐẠT" : "CHƯA ĐẠT"} — ${a.correctCount}/${a.total}`
                        : "Đang làm dở"}
                      {a.failedCritical ? " · liệt" : ""}
                    </a>
                    <span className="muted">
                      {new Date(a.startedAt).toLocaleString("vi-VN")}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}
