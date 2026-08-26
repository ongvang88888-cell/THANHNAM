import { apiGet, formatVnd } from "@/lib/api";
import { productTypeLabel } from "@/lib/labels";

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
    error = e instanceof Error ? e.message : "Không tải được cửa hàng";
  }

  const badgeFor = (id: string) =>
    campaigns.find((c) => c.products.some((p) => p.productId === id))?.badgeText;

  return (
    <>
      <section className="hero">
        <div>
          <h1>Học một lần. Dùng được ngay.</h1>
          <p>
            Khóa học video, tài liệu nghiên cứu và combo. Xem trước miễn phí, mua một lần,
            hoặc mở khóa tạm bằng quảng cáo thưởng.
          </p>
          <div className="studio-actions">
            <a className="btn" href="#catalog">
              Xem khóa học
            </a>
            <a className="btn secondary" href="/login">
              Vào thư viện
            </a>
          </div>
        </div>
        <aside className="hero-aside">
          <strong>Dành cho giảng viên</strong>
          <p className="muted">
            Studio soạn chương–bài, tải PDF nghiên cứu, gửi admin duyệt. Học viên học với mục lục
            rõ ràng như các nền tảng khóa học chuyên nghiệp.
          </p>
          <a className="btn secondary" href="/teacher">
            Mở studio
          </a>
        </aside>
      </section>
      {error && (
        <p className="error">
          {error}. Kiểm tra API đã chạy tại <code>NEXT_PUBLIC_API_URL</code>.
        </p>
      )}
      <section id="catalog">
        <div className="page-head">
          <h1>Cửa hàng</h1>
          <p className="muted">Chọn khóa, tài liệu hoặc combo. Giá hiển thị bằng VND.</p>
        </div>
        {items.length === 0 && !error && <p className="muted">Chưa có sản phẩm công khai.</p>}
        <div className="grid">
          {items.map((p) => (
            <a className="product" key={p.id} href={`/products/${p.slug}`}>
              <div className="cover" />
              <div className="type">{productTypeLabel(p.type)}</div>
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
