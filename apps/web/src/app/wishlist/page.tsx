"use client";

import { useEffect, useState } from "react";
import { apiDelete, apiGet, formatVnd } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";

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
  const { token, ready } = useRequireAuth();
  const [items, setItems] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  function load() {
    if (!token) return;
    setError(null);
    apiGet<Row[]>("/wishlist", token)
      .then(setItems)
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Không tải được yêu thích");
      });
  }

  useEffect(() => {
    if (!ready || !token) return;
    load();
  }, [ready, token]);

  return (
    <section>
      <h1 style={{ fontFamily: "var(--font-display)" }}>Yêu thích</h1>
      {error && <p className="error">{error}</p>}
      <div className="grid">
        {!error && items.length === 0 && <p className="muted">Chưa có sản phẩm yêu thích.</p>}
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
                apiDelete(`/wishlist/${row.productId}`, token)
                  .then(load)
                  .catch((e: unknown) => {
                    setError(e instanceof Error ? e.message : "Không bỏ được yêu thích");
                  });
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
