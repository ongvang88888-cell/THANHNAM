"use client";

import { useEffect, useState } from "react";
import { HERO_SLIDES } from "@/lib/unica-data";

export function HeroSlider() {
  const [slide, setSlide] = useState(0);
  const current = HERO_SLIDES[slide] ?? HERO_SLIDES[0];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSlide((i) => (i + 1) % HERO_SLIDES.length);
    }, 5500);
    return () => window.clearInterval(timer);
  }, []);

  if (!current) return null;

  return (
    <section className="u-hero">
      <a className={`u-poster tone-${current.tone}`} href={current.href}>
        <div className="u-poster-shade" />
        <div className="u-poster-copy">
          <span className="u-kicker">{current.kicker}</span>
          <h1>{current.title}</h1>
          <p>{current.subtitle}</p>
          <span className="btn">{current.cta}</span>
        </div>
        <div className="u-poster-art" aria-hidden>
          <i />
          <i />
          <i />
        </div>
      </a>
      <button
        type="button"
        className="u-hero-nav is-prev"
        aria-label="Slide trước"
        onClick={() => setSlide((i) => (i - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
      >
        ‹
      </button>
      <button
        type="button"
        className="u-hero-nav is-next"
        aria-label="Slide tiếp"
        onClick={() => setSlide((i) => (i + 1) % HERO_SLIDES.length)}
      >
        ›
      </button>
      <div className="u-hero-dots">
        {HERO_SLIDES.map((row, i) => (
          <button
            key={row.id}
            type="button"
            className={i === slide ? "is-on" : undefined}
            aria-label={`Slide ${i + 1}`}
            onClick={() => setSlide(i)}
          />
        ))}
      </div>
    </section>
  );
}
