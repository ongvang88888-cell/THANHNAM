import { coverStyle, instructorLabel, type CatalogProduct } from "@/lib/catalog";
import { PriceTag } from "./PriceTag";
import { Stars } from "./Stars";

export function CourseCard({
  product,
  badge,
  rating,
  reviewCount,
}: {
  product: CatalogProduct;
  badge?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
}) {
  return (
    <a className="u-card" href={`/products/${product.slug}`}>
      <div className="u-card-cover" style={product.thumbnailUrl ? undefined : coverStyle(product.slug)}>
        {product.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.thumbnailUrl} alt="" />
        ) : (
          <span>{product.name.slice(0, 1)}</span>
        )}
        {badge ? <em className="u-card-badge">{badge}</em> : null}
      </div>
      <div className="u-card-body">
        <h3>{product.name}</h3>
        <p className="u-card-teacher">{instructorLabel(product)}</p>
        <Stars value={rating} count={reviewCount} />
        <PriceTag amountMinor={product.price?.amountMinor} compareAtMinor={product.price?.compareAtMinor} />
      </div>
    </a>
  );
}
