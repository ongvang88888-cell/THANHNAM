"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Cert = {
  publicId: string;
  issuedAt: string;
  course: { title: string; product?: { slug: string } };
};

export default function CertificatesPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<Cert[]>([]);

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    apiGet<Cert[]>("/me/certificates", token).then(setItems).catch(console.error);
  }, [token, router]);

  return (
    <section>
      <h1 style={{ fontFamily: "var(--font-display)" }}>Chứng chỉ</h1>
      <div className="panel">
        {items.length === 0 && <p className="muted">Hoàn thành khóa học để nhận chứng chỉ.</p>}
        <ul className="lesson-list">
          {items.map((c) => (
            <li key={c.publicId}>
              <div>
                <strong>{c.course.title}</strong>
                <div className="muted">{new Date(c.issuedAt).toLocaleDateString("vi-VN")}</div>
              </div>
              <a href={`/verify/certificate/${c.publicId}`}>Xác minh công khai</a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
