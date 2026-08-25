"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function TeacherPage() {
  const { token, user } = useAuth();
  const router = useRouter();
  const [courses, setCourses] = useState<Array<{ id: string; title: string; status: string }>>([]);
  const [title, setTitle] = useState("New Course");
  const [slug, setSlug] = useState(`course-${Date.now()}`);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    apiGet<Array<{ id: string; title: string; status: string }>>("/teacher/courses", token)
      .then(setCourses)
      .catch((e) => setMsg(e.message));
  }, [token, router]);

  async function createCourse() {
    if (!token) return;
    const res = await apiPost<{ course: { id: string; title: string; status: string } }>(
      "/teacher/courses",
      { title, slug, description: "Draft course", priceMinor: 19900000 },
      token,
    );
    await apiPost(
      `/teacher/courses/${res.course.id}/curriculum`,
      {
        sections: [
          {
            title: "Section 1",
            lessons: [
              { title: "Preview lesson", isPreview: true, body: "Free preview content" },
              { title: "Paid lesson", isPreview: false, body: "Paid lesson body" },
            ],
          },
        ],
      },
      token,
    ).catch(async () => {
      // curriculum uses PATCH
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1"}/teacher/courses/${res.course.id}/curriculum`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "X-App-Id": "education_app",
          },
          body: JSON.stringify({
            sections: [
              {
                title: "Section 1",
                lessons: [
                  { title: "Preview lesson", isPreview: true, body: "Free preview content" },
                  { title: "Paid lesson", isPreview: false, body: "Paid lesson body" },
                ],
              },
            ],
          }),
        },
      );
    });
    setMsg(`Created ${res.course.title}`);
    const list = await apiGet<Array<{ id: string; title: string; status: string }>>(
      "/teacher/courses",
      token,
    );
    setCourses(list);
  }

  return (
    <section>
      <h1 style={{ fontFamily: "var(--font-display)" }}>Teacher Portal</h1>
      <p className="muted">Đăng nhập teacher@edu.local để tạo khóa học (scoped theo creator).</p>
      {user && <p>User: {user.email}</p>}
      <div className="panel stack" style={{ marginBottom: 24 }}>
        <label>Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
        <label>Slug</label>
        <input value={slug} onChange={(e) => setSlug(e.target.value)} />
        <button onClick={createCourse}>Create draft course + curriculum</button>
        {msg && <p className="ok">{msg}</p>}
      </div>
      <div className="panel">
        <h2>My courses</h2>
        <ul className="lesson-list">
          {courses.map((c) => (
            <li key={c.id}>
              <span>
                {c.title} <span className="badge">{c.status}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
