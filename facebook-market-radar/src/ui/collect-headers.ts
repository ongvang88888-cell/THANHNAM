const STORAGE = "fmr-collect-key";

export function readCollectKey(): string {
  if (typeof window === "undefined") {
    return "";
  }
  return sessionStorage.getItem(STORAGE) ?? "";
}

export function writeCollectKey(key: string): void {
  if (typeof window === "undefined") {
    return;
  }
  const trimmed = key.trim();
  if (!trimmed) {
    sessionStorage.removeItem(STORAGE);
    return;
  }
  sessionStorage.setItem(STORAGE, trimmed);
}

export function collectJsonHeaders(): Headers {
  const headers = new Headers({ "Content-Type": "application/json" });
  const key = readCollectKey();
  if (key) {
    headers.set("x-fmr-key", key);
  }
  return headers;
}
