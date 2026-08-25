const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
const APP_ID = process.env.NEXT_PUBLIC_APP_ID || "education_app";

export type AccessDecision = {
  code: string;
  reasons?: string[];
  productIds?: string[];
  rewardPolicyId?: string;
  expiresAt?: string;
};

function authHeaders(token?: string | null): HeadersInit {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    "X-App-Id": APP_ID,
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

export async function apiGet<T>(path: string, token?: string | null): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || "Request failed");
  return json as T;
}

export async function apiPost<T>(path: string, body: unknown, token?: string | null): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || "Request failed");
  return json as T;
}

export function formatVnd(amountMinor: number): string {
  return `${amountMinor.toLocaleString("vi-VN")}₫`;
}

export { API_URL, APP_ID };
