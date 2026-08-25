const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
const APP_ID = process.env.NEXT_PUBLIC_APP_ID || "education_app";

export type AccessDecision = {
  code: string;
  reasons?: string[];
  productIds?: string[];
  rewardPolicyId?: string;
  expiresAt?: string;
};

type TokenPair = {
  accessToken: string | null;
  refreshToken: string | null;
};

const tokens: TokenPair = { accessToken: null, refreshToken: null };

export function setApiTokens(accessToken: string | null, refreshToken: string | null) {
  tokens.accessToken = accessToken;
  tokens.refreshToken = refreshToken;
}

export function getApiTokens(): TokenPair {
  return { ...tokens };
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function authHeaders(token?: string | null): Record<string, string> {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    "X-App-Id": APP_ID,
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function parseJson<T>(res: Response): Promise<T> {
  const json = (await res.json().catch(() => ({}))) as {
    error?: { message?: string };
  } & T;
  if (!res.ok) {
    throw new ApiError(json?.error?.message || `Request failed (${res.status})`, res.status);
  }
  return json as T;
}

async function refreshAccess(): Promise<string | null> {
  if (!tokens.refreshToken) return null;
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ refreshToken: tokens.refreshToken }),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    accessToken: string;
    refreshToken: string;
    user?: unknown;
  };
  tokens.accessToken = json.accessToken;
  tokens.refreshToken = json.refreshToken;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("edu-auth-refreshed", { detail: json }));
  }
  return json.accessToken;
}

async function request<T>(
  path: string,
  init: { method?: string; body?: unknown; token?: string | null } = {},
): Promise<T> {
  const method = init.method ?? "GET";
  const run = (token?: string | null) =>
    fetch(`${API_URL}${path}`, {
      method,
      headers: authHeaders(token),
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: "no-store",
    });

  const firstToken = init.token ?? tokens.accessToken;
  let res = await run(firstToken);
  if (res.status === 401 && tokens.refreshToken) {
    const next = await refreshAccess();
    if (next) res = await run(next);
  }
  return parseJson<T>(res);
}

export async function apiGet<T>(path: string, token?: string | null): Promise<T> {
  return request<T>(path, { token });
}

export async function apiPost<T>(path: string, body: unknown, token?: string | null): Promise<T> {
  return request<T>(path, { method: "POST", body, token });
}

export async function apiPatch<T>(path: string, body: unknown, token?: string | null): Promise<T> {
  return request<T>(path, { method: "PATCH", body, token });
}

export async function apiPut<T>(path: string, body: unknown, token?: string | null): Promise<T> {
  return request<T>(path, { method: "PUT", body, token });
}

export async function apiDelete<T>(path: string, token?: string | null): Promise<T> {
  return request<T>(path, { method: "DELETE", token });
}

export async function apiPutBinary(
  url: string,
  body: Blob | ArrayBuffer,
  contentType: string,
): Promise<void> {
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body,
  });
  if (!res.ok) throw new Error(`Upload failed (${res.status})`);
}

export function formatVnd(amountMinor: number): string {
  return `${amountMinor.toLocaleString("vi-VN")}₫`;
}

export { API_URL, APP_ID };
