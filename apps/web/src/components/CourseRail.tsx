import type { CatalogCampaign, CatalogProduct } from "@/lib/catalog";
import { CourseCard } from "./CourseCard";

export function CourseRail({
  title,
  href,
  products,
  campaigns,
}: {
  title: string;
  href?: string;
  products: CatalogProduct[];
  campaigns?: CatalogCampaign[];
}) {
  if (products.length === 0) return null;
  const badgeFor = (id: string) =>
    campaigns?.find((campaign) => campaign.products.some((row) => row.productId === id))?.badgeText;
  return (
    <section className="u-rail">
      <div className="u-rail-head">
        <h2>{title}</h2>
        {href ? (
          <a href={href}>
            Xem tiếp <span aria-hidden>›</span>
          </a>
        ) : null}
      </div>
      <div className="u-rail-track">
        {products.map((product) => (
          <CourseCard key={product.id} product={product} badge={badgeFor(product.id)} />
        ))}
      </div>
    </section>
  );
}
