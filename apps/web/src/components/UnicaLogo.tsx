export function UnicaLogo({ className = "u-logo" }: { className?: string }) {
  return (
    <a className={className} href="/" aria-label="Unica - Học online mọi kỹ năng">
      <svg viewBox="0 0 148 36" width="140" height="34" role="img">
        <title>unica</title>
        <text
          x="0"
          y="28"
          fontFamily="Inter, Segoe UI, sans-serif"
          fontWeight="800"
          fontSize="32"
          letterSpacing="-1.2"
        >
          <tspan fill="#f05a28">u</tspan>
          <tspan fill="#1e3a5f">nica</tspan>
        </text>
      </svg>
    </a>
  );
}
