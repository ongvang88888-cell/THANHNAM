"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiPost } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";

type DocPayload = {
  documentId: string;
  title: string;
  version: number;
  mime: string;
  url: string;
  expiresAt: string;
};

export default function DocumentPage() {
  const params = useParams<{ documentId: string }>();
  const { token, ready } = useRequireAuth();
  const [doc, setDoc] = useState<DocPayload | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ready || !token) return;
    void apiPost<DocPayload>(`/documents/${params.documentId}/content`, {}, token)
      .then(setDoc)
      .catch((err: Error) => setError(err.message));
  }, [params.documentId, ready, token]);

  return (
    <section>
      <p className="muted">
        <a href="/library">← Library</a>
      </p>
      <h1 style={{ fontFamily: "var(--font-display)" }}>{doc?.title || "Document"}</h1>
      {error && <p className="error">{error}</p>}
      {doc && (
        <div className="panel stack" style={{ maxWidth: 520 }}>
          <p>
            Version {doc.version} · {doc.mime}
          </p>
          <a className="btn" href={doc.url} target="_blank" rel="noreferrer">
            Download / open
          </a>
          <p className="muted">
            Link ngắn hạn, entitlement-gated. Mở lại trang này nếu hết hạn (
            {new Date(doc.expiresAt).toLocaleString()}).
          </p>
        </div>
      )}
    </section>
  );
}
