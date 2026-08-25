"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiDelete, apiGet, formatVnd } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Row = {
  productId: string;
  product: {
    name: string;
    slug: string;
    type: string;
    prices: Array<{ amountMinor: number }>;
  };
};

export default function WishlistPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<Row[]>([]);

  function load() {
    if (!token) return;
    apiGet<Row[]>("/wishlist", token).then(setItems).catch(console.error);
  }

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    load();
  }, [token, router]);

  return (
    <section>
      <h1 style={{ fontFamily: "var(--font-display)" }}>Yêu thích</h1>
      <div className="grid">
        {items.length === 0 && <p className="muted">Chưa có sản phẩm yêu thích.</p>}
        {items.map((row) => (
          <div className="product" key={row.productId}>
            <div className="type">{row.product.type}</div>
            <h3>
              <a href={`/products/${row.product.slug}`}>{row.product.name}</a>
            </h3>
            <p className="price">
              {row.product.prices[0] ? formatVnd(row.product.prices[0].amountMinor) : "—"}
            </p>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                if (!token) return;
                apiDelete(`/wishlist/${row.productId}`, token).then(load).catch(console.error);
              }}
            >
              Bỏ yêu thích
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
