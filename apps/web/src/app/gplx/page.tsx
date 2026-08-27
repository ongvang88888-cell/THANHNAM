"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";

type Overview = {
  licenseClass: string;
  rules: {
    questionCount: number;
    passCorrectCount: number;
    durationSec: number;
    criticalFailEnabled: boolean;
  };
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
    startedAt: string;
    submittedAt: string | null;
  }>;
};

const CLASSES = ["A1", "A", "B1", "B", "C", "D", "E", "F"];

export default function GplxHomePage() {
  const { token, ready } = useRequireAuth();
  const [licenseClass, setLicenseClass] = useState("B");
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!ready || !token) return;
    setError(null);
    apiGet<Overview>(`/gplx/overview?licenseClass=${licenseClass}`, token)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Lỗi tải dữ liệu"));
  }, [ready, token, licenseClass]);

  const durationLabel = useMemo(() => {
    if (!data) return "";
    const m = Math.round(data.rules.durationSec / 60);
    return `${m} phút`;
  }, [data]);

  async function startExam() {
    if (!token) return;
    setStarting(true);
    setError(null);
    try {
      const res = await apiPost<{ attemptId: string }>(
        "/gplx/mock/start",
        { licenseClass },
        token,
      );
      window.location.href = `/gplx/exam/${res.attemptId}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không bắt đầu được đề thi");
      setStarting(false);
    }
  }

  if (!ready) return <p className="muted">Đang tải…</p>;

  return (
    <section>
      <p className="muted" style={{ marginBottom: 8 }}>
        Ôn lý thuyết · Thi thử
      </p>
      <h1 style={{ fontFamily: "var(--font-display)", marginTop: 0 }}>
        GPLX 2026
      </h1>
      <p className="muted" style={{ maxWidth: 560 }}>
        Học theo chuyên đề, ôn câu điểm liệt và thi thử theo cấu trúc hạng bằng.
        Điểm và kết quả đạt/không đạt được chấm trên server.
      </p>

      <div className="panel" style={{ marginTop: 20, marginBottom: 20 }}>
        <label htmlFor="gplx-class" style={{ fontWeight: 600 }}>
          Hạng bằng
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
          {CLASSES.map((c) => (
            <button
              key={c}
              type="button"
              id={c === licenseClass ? "gplx-class" : undefined}
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
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 12,
              marginBottom: 24,
            }}
          >
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
          </div>

          <div className="panel" style={{ marginBottom: 24 }}>
            <h2 style={{ marginTop: 0, fontFamily: "var(--font-display)" }}>
              Thi thử hạng {data.licenseClass}
            </h2>
            <p className="muted">
              {data.rules.questionCount} câu · Đạt từ {data.rules.passCorrectCount}/
              {data.rules.questionCount} · {durationLabel}
              {data.rules.criticalFailEnabled
                ? " · Sai câu điểm liệt = không đạt"
                : ""}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <button type="button" onClick={() => void startExam()} disabled={starting}>
                {starting ? "Đang tạo đề…" : "Bắt đầu thi thử"}
              </button>
              <a className="btn secondary" href={`/gplx/critical?licenseClass=${licenseClass}`}>
                Ôn câu điểm liệt
              </a>
              <a className="btn secondary" href={`/gplx/wrong?licenseClass=${licenseClass}`}>
                Ôn câu hay sai
              </a>
            </div>
          </div>

          <h2 style={{ fontFamily: "var(--font-display)" }}>Học theo chuyên đề</h2>
          <ul className="lesson-list">
            {data.topics.map((t) => (
              <li key={t.id}>
                <a href={`/gplx/topics/${t.id}?licenseClass=${licenseClass}`}>
                  {t.title}{" "}
                  <span className="muted">({t.questionCount} câu)</span>
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
