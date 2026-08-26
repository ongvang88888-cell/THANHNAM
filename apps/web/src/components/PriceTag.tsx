import { formatVnd } from "@/lib/api";
import { discountPercent } from "@/lib/catalog";

export function PriceTag({
  amountMinor,
  compareAtMinor,
  size = "card",
}: {
  amountMinor: number | null | undefined;
  compareAtMinor?: number | null;
  size?: "card" | "box";
}) {
  if (amountMinor == null) return <span className={`u-price u-price-${size}`}>—</span>;
  if (amountMinor === 0) {
    return <span className={`u-price u-price-${size} is-free`}>Miễn phí</span>;
  }
  const off = discountPercent(amountMinor, compareAtMinor ?? null);
  return (
    <span className={`u-price u-price-${size}`}>
      <strong>{formatVnd(amountMinor)}</strong>
      {compareAtMinor && compareAtMinor > amountMinor ? <s>{formatVnd(compareAtMinor)}</s> : null}
      {off && size === "box" ? <span className="u-off">-{off}%</span> : null}
    </span>
  );
}
