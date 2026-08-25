import { apiGet, formatVnd } from "@/lib/api";

type Product = {
  id: string;
  type: string;
  name: string;
  slug: string;
  description: string;
  price: { currency: string; amountMinor: number; compareAtMinor: number | null } | null;
};

export default async function HomePage() {
  const data = await apiGet<{ items: Product[] }>("/products");
  return (
    <>
      <section className="hero">
        <h1>EduCommerce</h1>
        <p>
          Nền tảng bán khóa học video, tài liệu số và combo — với free preview, mua một lần,
          và mở khóa bằng quảng cáo thưởng.
        </p>
      </section>
      <section>
        <h2 style={{ fontFamily: "var(--font-display)" }}>Catalog</h2>
        <div className="grid">
          {data.items.map((p) => (
            <a className="product" key={p.id} href={`/products/${p.slug}`}>
              <div className="type">{p.type.replaceAll("_", " ")}</div>
              <h3>{p.name}</h3>
              <p className="muted">{p.description}</p>
              <div className="price">
                {p.price ? formatVnd(p.price.amountMinor) : "—"}
              </div>
            </a>
          ))}
        </div>
      </section>
    </>
  );
}
