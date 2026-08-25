"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type LibraryProduct = {
  id: string;
  name: string;
  slug: string;
  type: string;
  course?: { id: string } | null;
  document?: { id: string } | null;
};

function hrefFor(p: LibraryProduct): string {
  if (p.type === "DIGITAL_DOCUMENT" && p.document?.id) {
    return `/documents/${p.document.id}`;
  }
  if (p.type === "VIDEO_COURSE") {
    return `/products/${p.slug}`;
  }
  return `/products/${p.slug}`;
}

export default function LibraryPage() {
  const { token, user, logout } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<{
    products: LibraryProduct[];
    continueLearning?: Array<{ lessonId: string; lessonTitle: string; courseTitle: string }>;
  } | null>(null);

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    Promise.all([
      apiGet<{ products: LibraryProduct[] }>("/me/library", token),
      apiGet<Array<{ lessonId: string; lessonTitle: string; courseTitle: string }>>(
        "/me/continue",
        token,
      ),
    ])
      .then(([library, cont]) => setData({ ...library, continueLearning: cont }))
      .catch(console.error);
  }, [token, router]);

  if (!user) return <p className="muted">Loading...</p>;

  return (
    <section>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", marginBottom: 4 }}>My Library</h1>
          <p className="muted">
            {user.displayName || user.email} · roles: {user.roles.join(", ")}
          </p>
        </div>
        <button className="secondary" onClick={logout}>
          Logout
        </button>
      </div>

      <h2 style={{ fontFamily: "var(--font-display)" }}>Continue Learning</h2>
      <div className="panel">
        {(data?.continueLearning?.length ?? 0) === 0 && <p className="muted">Chưa có tiến độ.</p>}
        <ul className="lesson-list">
          {data?.continueLearning?.map((c) => (
            <li key={c.lessonId}>
              <a href={`/learn/${c.lessonId}`}>
                {c.courseTitle} — {c.lessonTitle}
              </a>
            </li>
          ))}
        </ul>
      </div>

      <h2 style={{ fontFamily: "var(--font-display)" }}>Owned products</h2>
      <div className="grid">
        {data?.products.map((p) => (
          <a className="product" key={p.id} href={hrefFor(p)}>
            <div className="type">{p.type}</div>
            <h3>{p.name}</h3>
            <p className="muted">
              {p.type === "DIGITAL_DOCUMENT"
                ? "Open document"
                : p.type.includes("BUNDLE")
                  ? "Open bundle"
                  : "Open course"}
            </p>
          </a>
        ))}
      </div>
    </section>
  );
}
