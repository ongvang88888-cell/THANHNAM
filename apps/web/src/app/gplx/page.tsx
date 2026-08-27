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

const CLASSES = ["A1", "A", "B1", "B", "C", "D", "E", "F"];
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

  const durationLabel = useMemo(() => {
    if (!data) return "";
    return `${Math.round(data.rules.durationSec / 60)} phút`;
  }, [data]);

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
    <section>
      <p className="muted" style={{ marginBottom: 8 }}>
        Ôn lý thuyết · Thi thử · Flashcard · Bộ đề cố định
      </p>
      <h1 style={{ fontFamily: "var(--font-display)", marginTop: 0 }}>GPLX 2026</h1>
      <p className="muted" style={{ maxWidth: 560 }}>
        Học theo chuyên đề, câu điểm liệt, biển báo, bookmark và thi thử chấm trên server — các
        tính năng chuẩn app ôn GPLX phổ biến.
      </p>

      <div className="panel" style={{ marginTop: 20, marginBottom: 20 }}>
        <strong>Hạng bằng</strong>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
          {CLASSES.map((c) => (
            <button
              key={c}
              type="button"
              className={c === licenseClass ? "" : "secondary"}
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
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
              gap: 12,
              marginBottom: 24,
            }}
          >
            <div className="panel">
              <div className="muted">Chuỗi ngày</div>
              <strong style={{ fontSize: "1.4rem" }}>
                {data.streak?.currentStreak ?? 0}
              </strong>
              <div className="muted" style={{ fontSize: "0.85rem" }}>
                kỷ lục {data.streak?.longestStreak ?? 0}
              </div>
            </div>
            <div className="panel">
              <div className="muted">Tổng câu</div>
              <strong style={{ fontSize: "1.4rem" }}>{data.stats.totalQuestions}</strong>
            </div>
            <div className="panel">
              <div className="muted">Đã thuộc</div>
              <strong style={{ fontSize: "1.4rem" }}>{data.stats.mastered}</strong>
            </div>
            <div className="panel">
              <div className="muted">Hay sai</div>
              <strong style={{ fontSize: "1.4rem" }}>{data.stats.wrong}</strong>
            </div>
            <div className="panel">
              <div className="muted">Câu liệt</div>
              <strong style={{ fontSize: "1.4rem" }}>{data.stats.criticalCount}</strong>
            </div>
            <div className="panel">
              <div className="muted">Bookmark</div>
              <strong style={{ fontSize: "1.4rem" }}>{data.bookmarkCount ?? 0}</strong>
            </div>
          </div>

          <div className="panel" style={{ marginBottom: 24 }}>
            <h2 style={{ marginTop: 0, fontFamily: "var(--font-display)" }}>
              Thi thử hạng {data.licenseClass}
            </h2>
            <p className="muted">
              {data.rules.questionCount} câu · Đạt từ {data.rules.passCorrectCount}/
              {data.rules.questionCount} · {durationLabel}
              {data.rules.criticalFailEnabled ? " · Sai câu liệt = không đạt" : ""}
            </p>
            <p className="muted">
              {data.isPro
                ? "GPLX Pro: thi thử không giới hạn"
                : `Free: còn ${data.mocksRemainingToday ?? 0}/${data.freeMocksPerDay} đề hôm nay`}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <button
                type="button"
                onClick={() => void startExam("random")}
                disabled={!!starting}
              >
                {starting === "random" ? "Đang tạo đề…" : "Đề ngẫu nhiên (chuẩn)"}
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => void startExam("critical_only")}
                disabled={!!starting}
              >
                {starting === "critical_only" ? "Đang tạo…" : "Chỉ câu điểm liệt"}
              </button>
              <a className="btn secondary" href={`/gplx/sets?licenseClass=${licenseClass}`}>
                Bộ đề cố định
              </a>
              {!data.isPro && data.proProduct && (
                <a className="btn secondary" href={`/products/${data.proProduct.slug}`}>
                  Nâng cấp {data.proProduct.name}
                  {data.proProduct.price
                    ? ` — ${(data.proProduct.price.amountMinor / 100).toLocaleString("vi-VN")}₫`
                    : ""}
                </a>
              )}
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 24 }}>
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
              Top câu khó
            </a>
            <a className="btn secondary" href={`/gplx/tips`}>
              Mẹo ghi nhớ
            </a>
            <a className="btn secondary" href={`/gplx/signs`}>
              Thư viện biển báo
            </a>
            <a className="btn secondary" href={`/gplx/plan?licenseClass=${licenseClass}`}>
              Lộ trình 7 ngày
            </a>
          </div>

          {data.weakTopics && data.weakTopics.length > 0 && (
            <div className="panel" style={{ marginBottom: 24 }}>
              <h2 style={{ marginTop: 0, fontFamily: "var(--font-display)" }}>
                Chuyên đề yếu
              </h2>
              <ul className="lesson-list">
                {data.weakTopics.map((t) => (
                  <li key={t.topicId}>
                    <a href={`/gplx/topics/${t.topicId}?licenseClass=${licenseClass}`}>
                      {t.topicTitle}
                    </a>
                    <span className="muted">
                      sai {t.wrong}/{t.attempted} ({Math.round(t.wrongRate * 100)}%)
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.planPreview?.length > 0 && (
            <div className="panel" style={{ marginBottom: 24 }}>
              <h2 style={{ marginTop: 0, fontFamily: "var(--font-display)" }}>
                Lộ trình nhanh
              </h2>
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

          <h2 style={{ fontFamily: "var(--font-display)" }}>Học theo chuyên đề</h2>
          <ul className="lesson-list">
            {data.topics.map((t) => (
              <li key={t.id}>
                <a href={`/gplx/topics/${t.id}?licenseClass=${licenseClass}`}>
                  {t.title} <span className="muted">({t.questionCount} câu)</span>
                </a>
              </li>
            ))}
          </ul>

          {data.recentAttempts.length > 0 && (
            <>
              <h2 style={{ fontFamily: "var(--font-display)" }}>Lịch sử thi thử</h2>
              <ul className="lesson-list">
                {data.recentAttempts.map((a) => (
                  <li key={a.id}>
                    <a href={`/gplx/exam/${a.id}`}>
                      {a.submittedAt
                        ? `${a.passed ? "ĐẠT" : "CHƯA ĐẠT"} — ${a.correctCount}/${a.total}`
                        : "Đang làm dở"}
                      {a.mode && a.mode !== "random" ? ` · ${a.mode}` : ""}
                      {a.failedCritical ? " (sai câu liệt)" : ""}{" "}
                      <span className="muted">
                        {new Date(a.startedAt).toLocaleString("vi-VN")}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </section>
  );
}
