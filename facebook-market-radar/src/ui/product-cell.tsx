import Link from "next/link";
import { priceConfidenceLabel, type PriceEstimate } from "@/domain/price";

export function ProductCell({
  title,
  imageUrls,
  price,
  adSummary,
  href,
}: {
  title: string;
  imageUrls: string[];
  price?: PriceEstimate | null;
  adSummary?: string;
  href?: string;
}) {
  const thumbs = imageUrls.slice(0, 4);
  return (
    <div className="product-cell">
      <div className="product-thumbs" aria-hidden={thumbs.length === 0}>
        {thumbs.map((src) => (
          <img key={src} src={src} alt="" width={48} height={48} />
        ))}
      </div>
      <div className="product-meta">
        {href ? (
          <Link className="product-name" href={href}>
            {title}
          </Link>
        ) : (
          <span className="product-name">{title}</span>
        )}
        {price ? (
          <span className={`product-price ${price.confidence}`}>
            {price.label}
            <span className="product-price-src"> · {priceConfidenceLabel(price.confidence)}</span>
          </span>
        ) : null}
        {adSummary ? <span className="product-ads">{adSummary}</span> : null}
      </div>
    </div>
  );
}
