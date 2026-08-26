export function Stars({
  value,
  count,
}: {
  value?: number | null;
  count?: number | null;
}) {
  const rating = value && value > 0 ? Math.min(5, value) : null;
  const full = rating ? Math.round(rating) : 0;
  return (
    <span className="u-stars">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < full ? "is-on" : undefined}>
          ★
        </span>
      ))}
      {rating ? <b>{rating.toFixed(1)}</b> : <span className="u-stars-new">Mới</span>}
      {typeof count === "number" && count > 0 ? <em>({count})</em> : null}
    </span>
  );
}
