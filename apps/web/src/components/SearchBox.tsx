"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function SearchBox({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next = q.trim();
    router.push(next ? `/search?q=${encodeURIComponent(next)}` : "/khoa-hoc");
  }

  return (
    <form className={`u-search${compact ? " is-compact" : ""}`} onSubmit={onSubmit} role="search">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Tìm khóa học, giảng viên"
        aria-label="Tìm khóa học, giảng viên"
      />
      <button type="submit" aria-label="Tìm kiếm">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
      </button>
    </form>
  );
}
