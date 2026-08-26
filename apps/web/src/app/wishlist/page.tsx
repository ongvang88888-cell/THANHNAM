"use client";

import { useEffect, useState } from "react";
import { apiDelete, apiGet, formatVnd } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";
import { coverStyle } from "@/lib/catalog";

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
    <div className="u-wrap">
      <div className="u-page-head">
        <h1>Khóa học yêu thích</h1>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="u-grid">
        {!error && items.length === 0 && <p className="muted">Chưa có sản phẩm yêu thích.</p>}
        {items.map((row) => (
          <div className="u-card" key={row.productId}>
            <div className="u-card-cover" style={coverStyle(row.product.slug)}>
              {row.product.name.slice(0, 1)}
            </div>
            <div className="u-card-body">
              <h3>
                <a href={`/products/${row.product.slug}`}>{row.product.name}</a>
              </h3>
              <p className="u-price">
                <strong>{row.product.prices[0] ? formatVnd(row.product.prices[0].amountMinor) : "—"}</strong>
              </p>
              <button
                type="button"
                className="ghost"
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
          </div>
        ))}
      </div>
    </div>
  );
}
