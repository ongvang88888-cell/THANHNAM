"use client";

type Props = {
  src?: string | null;
  alt: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZES = {
  sm: { maxWidth: 96, maxHeight: 96 },
  md: { maxWidth: 180, maxHeight: 180 },
  lg: { maxWidth: 280, maxHeight: 220 },
} as const;

/** Shared figure for GPLX sign / situation SVGs from `/public/gplx`. */
export function GplxFigure({ src, alt, size = "md", className }: Props) {
  if (!src) return null;
  const dim = SIZES[size];
  return (
    <figure
      className={className}
      style={{
        margin: "12px 0",
        padding: 12,
        borderRadius: 16,
        background: "rgba(255,255,255,0.85)",
        border: "1px solid var(--line)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        style={{
          width: "100%",
          maxWidth: dim.maxWidth,
          maxHeight: dim.maxHeight,
          objectFit: "contain",
        }}
      />
    </figure>
  );
}
