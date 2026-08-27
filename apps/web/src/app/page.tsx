import { apiGet, formatVnd } from "@/lib/api";

type Product = {
  id: string;
  type: string;
  name: string;
  slug: string;
  description: string;
  price: { currency: string; amountMinor: number; compareAtMinor: number | null } | null;
};

type Campaign = {
  badgeText: string;
  percentOff: number | null;
  endsAt: string;
  products: Array<{ productId: string }>;
};

export default async function HomePage() {
  let items: Product[] = [];
  let campaigns: Campaign[] = [];
  let error: string | null = null;
  try {
    const [catalog, active] = await Promise.all([
      apiGet<{ items: Product[] }>("/products"),
      apiGet<Campaign[]>("/campaigns/active").catch(() => []),
    ]);
    items = catalog.items;
    campaigns = active;
  } catch (e) {
    error = e instanceof Error ? e.message : "Không tải được catalog";
  }

  const badgeFor = (id: string) =>
    campaigns.find((c) => c.products.some((p) => p.productId === id))?.badgeText;

  return (
    <>
      <section className="gx-hero" style={{ minHeight: "min(58vh, 520px)" }}>
        <div className="gx-hero-bg" aria-hidden />
        <div className="gx-hero-road" aria-hidden />
        <div className="gx-hero-content">
          <p className="gx-brand" style={{ fontSize: "clamp(2.6rem, 8vw, 4.4rem)" }}>
            EduCommerce
          </p>
          <h2>Học có lộ trình — đậu có công cụ</h2>
          <p>
            Khóa học, tài liệu và ôn GPLX trong một nền tảng. Bắt đầu với thi thử lý thuyết sống
            động.
          </p>
          <div className="gx-cta-row">
            <a className="btn btn-primary-light" href="/gplx">
              Vào Đậu GPLX
            </a>
            <a className="btn btn-ghost-light" href="#catalog">
              Xem catalog
            </a>
          </div>
        </div>
      </section>
      {error && (
        <p className="error">
          {error}. Kiểm tra API đã chạy tại <code>NEXT_PUBLIC_API_URL</code>.
        </p>
      )}
      <section id="catalog">
        <h2 style={{ fontFamily: "var(--font-display)", letterSpacing: "0" }}>Catalog</h2>
        {items.length === 0 && !error && <p className="muted">Chưa có sản phẩm công khai.</p>}
        <div className="grid">
          {items.map((p) => (
            <a className="product" key={p.id} href={`/products/${p.slug}`}>
              <div className="type">{p.type.replaceAll("_", " ")}</div>
              {badgeFor(p.id) && <div className="badge paid">{badgeFor(p.id)}</div>}
              <h3>{p.name}</h3>
              <p className="muted">{p.description}</p>
              <div className="price">{p.price ? formatVnd(p.price.amountMinor) : "—"}</div>
            </a>
          ))}
        </div>
      </section>
    </>
  );
}
