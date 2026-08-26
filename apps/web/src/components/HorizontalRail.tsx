"use client";

import type { ReactNode } from "react";
import { useRef } from "react";

export function HorizontalRail({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  function scroll(direction: -1 | 1) {
    const node = trackRef.current;
    if (!node) return;
    node.scrollBy({ left: direction * Math.max(280, node.clientWidth * 0.72), behavior: "smooth" });
  }

  return (
    <div className="u-hrail">
      <button type="button" className="u-hrail-btn is-prev" aria-label={`Trước — ${label}`} onClick={() => scroll(-1)}>
        ‹
      </button>
      <div className="u-hrail-track" ref={trackRef}>
        {children}
      </div>
      <button type="button" className="u-hrail-btn is-next" aria-label={`Tiếp — ${label}`} onClick={() => scroll(1)}>
        ›
      </button>
    </div>
  );
}
