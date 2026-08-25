const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://127.0.0.1:3001/api/v1";
const APP_ID = process.env.EXPO_PUBLIC_APP_ID ?? "education_app";

export type ProductListItem = {
  id: string;
  slug: string;
  name: string;
  description: string;
  type: string;
  price: { currency: string; amountMinor: number } | null;
};

export type ProductDetail = {
  id: string;
  slug: string;
  name: string;
  description: string;
  type: string;
  prices: Array<{ amountMinor: number; currency: string }>;
};

async function request<T>(
  path: string,
  opts: { method?: string; token?: string; body?: unknown } = {}
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: opts.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      "X-App-Id": APP_ID,
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const json = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) {
    throw new Error(json?.error?.message || `HTTP ${res.status}`);
  }
  return json;
}

export const api = {
  listProducts: () =>
    request<{ items: ProductListItem[] }>("/products").then((r) => r.items),
  getProduct: (slug: string) => request<ProductDetail>(`/products/${slug}`),
  login: (email: string, password: string) =>
    request<{
      accessToken: string;
      user: { id: string; email: string; displayName?: string };
    }>("/auth/login", { method: "POST", body: { email, password } }),
  checkout: (token: string, productId: string) =>
    request<{ order: { status: string }; fulfilled?: boolean }>(
      "/checkout/sessions",
      {
        method: "POST",
        token,
        body: {
          productId,
          provider: "mock",
          idempotencyKey: `mobile-${productId}-${Date.now()}`,
        },
      }
    ),
  myLibrary: (token: string) =>
    request<{
      products: Array<{ id: string; name: string; slug: string; type: string }>;
    }>("/me/library", { token }),
};
