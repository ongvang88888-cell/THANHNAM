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
  metadataJson?: { playSku?: string; appleSku?: string };
  course?: { id: string; sections?: Array<{ lessons?: Array<{ id: string }> }> } | null;
  document?: { id: string } | null;
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

function platformForProvider(provider: "mock" | "google_play" | "apple_iap") {
  if (provider === "google_play") return "android";
  if (provider === "apple_iap") return "ios";
  return "unknown";
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
  checkout: (
    token: string,
    productId: string,
    provider: "mock" | "google_play" | "apple_iap" = "mock"
  ) =>
    request<{
      order: { id: string; status: string };
      fulfilled?: boolean;
      intent?: {
        clientAction?: {
          type?: string;
          sku?: string;
          packageName?: string;
          bundleId?: string;
          appAccountToken?: string;
        };
      };
    }>("/checkout/sessions", {
      method: "POST",
      token,
      body: {
        productId,
        provider,
        platform: platformForProvider(provider),
        idempotencyKey: `mobile-${provider}-${productId}-${Date.now()}`,
      },
    }),
  confirmGooglePlay: (
    token: string,
    input: { orderId: string; purchaseToken: string; productId?: string }
  ) =>
    request<{ ok: boolean; fulfilled?: boolean; order: { status: string } }>(
      "/payments/google-play/confirm",
      { method: "POST", token, body: input }
    ),
  confirmAppleIap: (
    token: string,
    input: {
      orderId: string;
      transactionId: string;
      productId?: string;
      signedTransaction?: string;
    }
  ) =>
    request<{ ok: boolean; fulfilled?: boolean; order: { status: string } }>(
      "/payments/apple-iap/confirm",
      { method: "POST", token, body: input }
    ),
  myLibrary: (token: string) =>
    request<{
      products: Array<{
        id: string;
        name: string;
        slug: string;
        type: string;
        course?: { id: string } | null;
        document?: { id: string } | null;
      }>;
    }>("/me/library", { token }),
  getLesson: (token: string, lessonId: string) =>
    request<{
      id: string;
      title: string;
      access: { code: string };
      contents: Array<{
        id: string;
        contentType?: string;
        body?: string | null;
        refId?: string | null;
      }>;
    }>(`/lessons/${lessonId}`, { token }),
  playback: (token: string, videoId: string, lessonId: string) =>
    request<{ playbackUrl: string }>(`/videos/${videoId}/playback`, {
      method: "POST",
      token,
      body: { lessonId },
    }),
  documentContent: (token: string, documentId: string) =>
    request<{ url: string; title: string; mime: string }>(
      `/documents/${documentId}/content`,
      { method: "POST", token, body: {} }
    ),
  rewardEligibility: (token: string, lessonId: string) =>
    request<{ eligible: boolean; reason?: string; rewardSessionId?: string }>(
      "/rewards/eligibility",
      {
        method: "POST",
        token,
        body: {
          resourceType: "lesson",
          resourceId: lessonId,
          policyCode: "lesson_unlock_24h",
        },
      }
    ),
  rewardDevComplete: (token: string, rewardSessionId: string) =>
    request("/rewards/dev/complete", {
      method: "POST",
      token,
      body: { rewardSessionId },
    }),
};
