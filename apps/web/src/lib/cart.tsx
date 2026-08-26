"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CatalogProduct } from "./catalog";

const CART_KEY = "unica_cart_v1";

export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  type: string;
  amountMinor: number;
  compareAtMinor: number | null;
  thumbnailUrl?: string | null;
};

type CartState = {
  items: CartItem[];
  ready: boolean;
  add: (product: CatalogProduct | CartItem) => void;
  remove: (productId: string) => void;
  has: (productId: string) => boolean;
  clear: () => void;
  count: number;
  totalMinor: number;
};

const CartContext = createContext<CartState | null>(null);

function toItem(product: CatalogProduct | CartItem): CartItem {
  if ("productId" in product && "amountMinor" in product) {
    return product;
  }
  return {
    productId: product.id,
    slug: product.slug,
    name: product.name,
    type: product.type,
    amountMinor: product.price?.amountMinor ?? 0,
    compareAtMinor: product.price?.compareAtMinor ?? null,
    thumbnailUrl: product.thumbnailUrl,
  };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (raw) setItems(JSON.parse(raw) as CartItem[]);
    } catch {
      setItems([]);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items, ready]);

  const add = useCallback((product: CatalogProduct | CartItem) => {
    const next = toItem(product);
    setItems((prev) => (prev.some((row) => row.productId === next.productId) ? prev : [...prev, next]));
  }, []);

  const remove = useCallback((productId: string) => {
    setItems((prev) => prev.filter((row) => row.productId !== productId));
  }, []);

  const has = useCallback((productId: string) => items.some((row) => row.productId === productId), [items]);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartState>(
    () => ({
      items,
      ready,
      add,
      remove,
      has,
      clear,
      count: items.length,
      totalMinor: items.reduce((sum, row) => sum + row.amountMinor, 0),
    }),
    [items, ready, add, remove, has, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("CartProvider missing");
  return ctx;
}
