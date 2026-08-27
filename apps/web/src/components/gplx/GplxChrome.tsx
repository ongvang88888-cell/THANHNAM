"use client";

import type { ReactNode } from "react";

export function GplxCrumb({
  licenseClass,
  trail,
}: {
  licenseClass?: string;
  trail?: Array<{ href?: string; label: string }>;
}) {
  return (
    <div className="gx-crumb">
      <a href={licenseClass ? `/gplx?licenseClass=${licenseClass}` : "/gplx"}>Đậu GPLX</a>
      {(trail ?? []).map((t) => (
        <span key={t.label}>
          <span aria-hidden> / </span>
          {t.href ? <a href={t.href}>{t.label}</a> : <span>{t.label}</span>}
        </span>
      ))}
    </div>
  );
}

export function GplxSection({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="panel" style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
        <h2 style={{ margin: 0, fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>
          {title}
        </h2>
        {action}
      </div>
      <div style={{ marginTop: 14 }}>{children}</div>
    </section>
  );
}
