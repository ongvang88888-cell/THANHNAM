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

export const BUSY_HTTP_MESSAGE =
  "Đang có nhiều thao tác. Đợi vài giây rồi thử lại — không cần chọn lại video.";

export function isBusyError(err: unknown): boolean {
  if (err instanceof ApiError && err.status === 429) return true;
  const message = err instanceof Error ? err.message : String(err);
  return /Throttler|Too Many Requests|đang bận|nhiều thao tác/i.test(message);
}

function friendlyHttpMessage(status: number, raw?: string): string {
  if (status === 429 || /Throttler|Too Many Requests/i.test(raw || "")) {
    return BUSY_HTTP_MESSAGE;
  }
  return raw || `Request failed (${status})`;
}

async function parseJson<T>(res: Response): Promise<T> {
  const json = (await res.json().catch(() => ({}))) as {
    error?: { message?: string };
    message?: string;
  } & T;
  if (!res.ok) {
    throw new ApiError(friendlyHttpMessage(res.status, json?.error?.message || json?.message), res.status);
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

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request<T>(
  path: string,
  init: { method?: string; body?: unknown; token?: string | null; retry429?: boolean } = {},
): Promise<T> {
  const method = init.method ?? "GET";
  const retry429 = init.retry429 ?? method === "GET";
  const run = (token?: string | null) =>
    fetch(`${API_URL}${path}`, {
      method,
      headers: authHeaders(token),
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: "no-store",
    });

  const firstToken = init.token ?? tokens.accessToken;
  const attempts = retry429 ? 4 : 1;
  let last: Response | null = null;
  for (let attempt = 0; attempt < attempts; attempt++) {
    let res = await run(firstToken);
    if (res.status === 401 && tokens.refreshToken) {
      const next = await refreshAccess();
      if (next) res = await run(next);
    }
    last = res;
    if (res.status === 429 && retry429 && attempt < attempts - 1) {
      await wait(1200 * 2 ** attempt);
      continue;
    }
    return parseJson<T>(res);
  }
  if (last) return parseJson<T>(last);
  throw new ApiError(friendlyHttpMessage(429), 429);
}

export async function apiGet<T>(path: string, token?: string | null): Promise<T> {
  return request<T>(path, { token, retry429: true });
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  token?: string | null,
  opts?: { retry429?: boolean },
): Promise<T> {
  return request<T>(path, { method: "POST", body, token, retry429: opts?.retry429 });
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
  if (!res.ok) throw new Error(`Không tải được file lên máy chủ (${res.status})`);
}

export function apiPutBinaryProgress(
  url: string,
  body: Blob,
  contentType: string,
  onProgress?: (ratio: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(event.loaded / event.total);
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      reject(new Error(`Không tải được file lên máy chủ (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Mất kết nối khi tải video lên. Thử lại."));
    xhr.send(body);
  });
}

export function formatVnd(amountMinor: number): string {
  return `${amountMinor.toLocaleString("vi-VN")}₫`;
}

export { API_URL, APP_ID };
