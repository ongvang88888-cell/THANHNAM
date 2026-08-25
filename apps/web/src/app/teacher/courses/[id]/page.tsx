"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";

type Course = {
  id: string;
  title: string;
  announcements: Array<{ id: string; title: string; body: string }>;
  quizzes: Array<{ id: string; title: string }>;
  sections: Array<{
    id: string;
    title: string;
    lessons: Array<{
      id: string;
      title: string;
      isPreview: boolean;
      dripDaysAfterPurchase: number | null;
    }>;
  }>;
};

export default function TeacherCoursePage() {
  const { id } = useParams<{ id: string }>();
  const { token, ready } = useRequireAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [annTitle, setAnnTitle] = useState("Thông báo mới");
  const [annBody, setAnnBody] = useState("");
  const [quizTitle, setQuizTitle] = useState("Quiz nhanh");
  const [stem, setStem] = useState("Câu hỏi 1?");
  const [dripDays, setDripDays] = useState("1");

  function load() {
    if (!token) return;
    apiGet<Course>(`/teacher/courses/${id}`, token).then(setCourse).catch((e: Error) => setMsg(e.message));
  }

  useEffect(() => {
    if (!ready || !token) return;
    load();
  }, [ready, token, id]);

  if (!course) return <p className="muted">{msg || "Loading…"}</p>;

  return (
    <section>
      <p>
        <a href="/teacher">← Giảng viên</a>
      </p>
      <h1 style={{ fontFamily: "var(--font-display)" }}>{course.title}</h1>
      {msg && <p className="ok">{msg}</p>}

      <div className="panel" style={{ marginBottom: 20 }}>
        <h2>Curriculum hiện tại</h2>
        {course.sections.map((s) => (
          <div key={s.id}>
            <h3>{s.title}</h3>
            <ul className="lesson-list">
              {s.lessons.map((l) => (
                <li key={l.id}>
                  <span>
                    {l.title} {l.isPreview ? "(preview)" : ""}{" "}
                    {l.dripDaysAfterPurchase ? `· drip ${l.dripDaysAfterPurchase} ngày` : ""}
                  </span>
                  <a href={`/learn/${l.id}`}>Xem</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <label>Cập nhật drip (ngày) cho bài trả phí cuối</label>
        <input value={dripDays} onChange={(e) => setDripDays(e.target.value)} />
        <button
          type="button"
          className="secondary"
          onClick={() => {
            if (!token) return;
            const paid = course.sections.flatMap((s) => s.lessons).filter((l) => !l.isPreview);
            const preview = course.sections.flatMap((s) => s.lessons).find((l) => l.isPreview);
            apiPatch(
              `/teacher/courses/${course.id}/drip`,
              {
                dripDaysAfterPurchase: Number(dripDays) || 0,
                setPreviewAsPrerequisite: Boolean(preview),
              },
              token,
            )
              .then(() => {
                setMsg(`Đã cập nhật drip/prereq (${paid.length} bài trả phí)`);
                load();
              })
              .catch((e: Error) => setMsg(e.message));
          }}
        >
          Áp dụng drip + prereq
        </button>
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <h2>Thông báo</h2>
        <ul className="lesson-list">
          {course.announcements.map((a) => (
            <li key={a.id}>
              <strong>{a.title}</strong> — {a.body}
            </li>
          ))}
        </ul>
        <input value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} />
        <input value={annBody} onChange={(e) => setAnnBody(e.target.value)} placeholder="Nội dung" />
        <button
          type="button"
          onClick={() => {
            if (!token) return;
            apiPost(`/courses/${course.id}/announcements`, { courseId: course.id, title: annTitle, body: annBody }, token)
              .then(() => {
                setMsg("Đã đăng thông báo");
                load();
              })
              .catch((e: Error) => setMsg(e.message));
          }}
        >
          Đăng thông báo
        </button>
      </div>

      <div className="panel">
        <h2>Quiz</h2>
        <ul className="lesson-list">
          {course.quizzes.map((q) => (
            <li key={q.id}>
              <a href={`/quizzes/${q.id}`}>{q.title}</a>
            </li>
          ))}
        </ul>
        <input value={quizTitle} onChange={(e) => setQuizTitle(e.target.value)} />
        <input value={stem} onChange={(e) => setStem(e.target.value)} />
        <button
          type="button"
          onClick={() => {
            if (!token) return;
            apiPost(
              `/teacher/courses/${course.id}/quizzes`,
              {
                title: quizTitle,
                questions: [
                  {
                    stem,
                    answers: [
                      { body: "Đúng", isCorrect: true },
                      { body: "Sai", isCorrect: false },
                    ],
                  },
                ],
              },
              token,
            )
              .then(() => {
                setMsg("Đã tạo quiz");
                load();
              })
              .catch((e: Error) => setMsg(e.message));
          }}
        >
          Tạo quiz MCQ
        </button>
      </div>
    </section>
  );
}
