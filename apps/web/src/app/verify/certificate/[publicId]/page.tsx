"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiGet } from "@/lib/api";

type VerifyResult =
  | { valid: false }
  | {
      valid: true;
      publicId: string;
      studentName: string | null;
      courseTitle: string;
      issuedAt: string;
    };

export default function CertificateVerifyPage() {
  const { publicId } = useParams<{ publicId: string }>();
  const [data, setData] = useState<VerifyResult | null>(null);

  useEffect(() => {
    apiGet<VerifyResult>(`/verify/certificate/${publicId}`).then(setData).catch(() =>
      setData({ valid: false }),
    );
  }, [publicId]);

  return (
    <section className="panel">
      <h1 style={{ fontFamily: "var(--font-display)", marginTop: 0 }}>
        Certificate verification
      </h1>
      {!data && <p className="muted">Checking...</p>}
      {data && !data.valid && <p className="error">Không hợp lệ hoặc đã thu hồi.</p>}
      {data && data.valid && (
        <>
          <p className="ok">Hợp lệ</p>
          <p>
            <strong>{data.studentName || "Learner"}</strong> đã hoàn thành{" "}
            <strong>{data.courseTitle}</strong>
          </p>
          <p className="muted">
            ID: {data.publicId} · Issued: {new Date(data.issuedAt).toLocaleString()}
          </p>
        </>
      )}
    </section>
  );
}
