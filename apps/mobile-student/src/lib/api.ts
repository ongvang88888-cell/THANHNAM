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

let refreshTokenMemory: string | null = null;
let onTokensRefreshed: ((access: string, refresh: string) => void) | null = null;

export function setMobileRefreshToken(token: string | null) {
  refreshTokenMemory = token;
}

export function onMobileAuthRefreshed(cb: ((access: string, refresh: string) => void) | null) {
  onTokensRefreshed = cb;
}

async function request<T>(
  path: string,
  opts: { method?: string; token?: string; body?: unknown } = {}
): Promise<T> {
  const run = (token?: string) =>
    fetch(`${API_URL}${path}`, {
      method: opts.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        "X-App-Id": APP_ID,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });

  let res = await run(opts.token);
  if (res.status === 401 && refreshTokenMemory && path !== "/auth/refresh") {
    const refreshed = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-App-Id": APP_ID },
      body: JSON.stringify({ refreshToken: refreshTokenMemory }),
    });
    if (refreshed.ok) {
      const pair = (await refreshed.json()) as { accessToken: string; refreshToken: string };
      refreshTokenMemory = pair.refreshToken;
      onTokensRefreshed?.(pair.accessToken, pair.refreshToken);
      res = await run(pair.accessToken);
    }
  }
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
      refreshToken?: string;
      user: { id: string; email: string; displayName?: string };
    }>("/auth/login", { method: "POST", body: { email, password } }),
  register: (email: string, password: string, displayName: string) =>
    request<{
      accessToken: string;
      refreshToken?: string;
      user: { id: string; email: string; displayName?: string };
    }>("/auth/register", {
      method: "POST",
      body: { email, password, displayName },
    }),
  logout: (refreshToken: string) =>
    request<{ ok: boolean }>("/auth/logout", {
      method: "POST",
      body: { refreshToken },
    }),
  forgot: (email: string) =>
    request<{ ok: boolean; resetToken?: string }>("/auth/forgot", {
      method: "POST",
      body: { email },
    }),
  reset: (token: string, password: string) =>
    request<{ ok: boolean }>("/auth/reset", {
      method: "POST",
      body: { token, password },
    }),
  saveProgress: (
    token: string,
    lessonId: string,
    body: { completed?: boolean; videoPositionMs?: number; timeSpentMs?: number },
  ) =>
    request(`/lessons/${lessonId}/progress`, {
      method: "PUT",
      token,
      body,
    }),
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
  gplxOverview: (token: string, licenseClass: string) =>
    request<{
      licenseClass: string;
      isPro: boolean;
      mocksRemainingToday: number | null;
      freeMocksPerDay: number;
      streak?: { currentStreak: number; longestStreak: number; lastStudyDate: string };
      bookmarkCount?: number;
      stats: {
        totalQuestions: number;
        criticalCount: number;
        mastered: number;
        wrong: number;
      };
      topics: Array<{ id: string; code: string; title: string; questionCount: number }>;
      rules: { questionCount: number; passCorrectCount: number; durationSec: number };
      proProduct: { slug: string; name: string } | null;
    }>(`/gplx/overview?licenseClass=${licenseClass}`, { token }),
  gplxStartMock: (
    token: string,
    licenseClass: string,
    mode: "random" | "fixed" | "critical_only" = "random",
    fixedSetId?: string,
  ) =>
    request<{ attemptId: string }>("/gplx/mock/start", {
      method: "POST",
      token,
      body: { licenseClass, mode, ...(fixedSetId ? { fixedSetId } : {}) },
    }),
  gplxFixedSets: (token: string, licenseClass: string) =>
    request<{
      items: Array<{
        id: string;
        code: string;
        title: string;
        licenseClass: string;
        questionCount: number;
      }>;
    }>(`/gplx/fixed-sets?licenseClass=${licenseClass}`, { token }),
  gplxFlashcards: (token: string, licenseClass: string, kind?: string) =>
    request<{ items: Array<{ id: string; front: string; back: string; kind: string }> }>(
      `/gplx/flashcards?licenseClass=${licenseClass}${kind ? `&kind=${kind}` : ""}`,
      { token },
    ),
  gplxGetAttempt: (token: string, attemptId: string) =>
    request<{
      attemptId: string;
      licenseClass: string;
      submitted: boolean;
      expiresAt?: string;
      questions?: Array<{
        id: string;
        stem: string;
        isCritical: boolean;
        answers: Array<{ id: string; body: string }>;
      }>;
      passed?: boolean;
      correctCount?: number;
      total?: number;
      failedCritical?: boolean;
      detail?: { review?: unknown };
    }>(`/gplx/mock/${attemptId}`, { token }),
  gplxSubmitMock: (
    token: string,
    attemptId: string,
    answers: Array<{ questionId: string; selectedAnswerIds: string[] }>,
  ) =>
    request<{
      passed: boolean;
      correctCount: number;
      total: number;
      failedCritical: boolean;
      licenseClass: string;
    }>(`/gplx/mock/${attemptId}/submit`, {
      method: "POST",
      token,
      body: { answers },
    }),
  gplxTopicQuestions: (token: string, topicId: string, licenseClass: string) =>
    request<{
      topic: { title: string };
      questions: Array<{
        id: string;
        stem: string;
        explanation: string;
        isCritical: boolean;
        answers: Array<{ id: string; body: string }>;
      }>;
    }>(`/gplx/topics/${topicId}/questions?licenseClass=${licenseClass}`, { token }),
  gplxPracticeAnswer: (
    token: string,
    questionId: string,
    selectedAnswerIds: string[],
  ) =>
    request<{ correct: boolean; explanation: string }>(
      "/gplx/practice/answer",
      { method: "POST", token, body: { questionId, selectedAnswerIds } },
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
