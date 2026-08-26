const PRIVATE_V4 =
  /^(0\.|10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;

export function isBlockedDownloadHost(host: string): boolean {
  const name = host.trim().toLowerCase();
  if (!name) return true;
  if (name === "localhost" || name === "0.0.0.0" || name === "::1") return true;
  if (name.endsWith(".local") || name.endsWith(".internal") || name.endsWith(".localhost")) return true;
  if (name.includes(":")) return true;
  if (PRIVATE_V4.test(name)) return true;
  return false;
}

export function parsePublicHttpsUrl(url: string, label = "URL"): URL {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    throw new Error(`${label} không hợp lệ`);
  }
  if (parsed.protocol !== "https:") {
    throw new Error(`${label} phải là https`);
  }
  if (isBlockedDownloadHost(parsed.hostname)) {
    throw new Error(`${label} không được trỏ máy nội bộ`);
  }
  return parsed;
}

export function hostAllowed(url: string, suffixes: readonly string[]): boolean {
  try {
    const parsed = parsePublicHttpsUrl(url);
    const host = parsed.hostname.toLowerCase();
    return suffixes.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
  } catch {
    return false;
  }
}

export const HEYGEN_MEDIA_HOSTS = ["heygen.com", "heygen.ai"] as const;
export const MINIMAX_MEDIA_HOSTS = [
  "minimax.io",
  "minimax.chat",
  "hailuoai.com",
  "hailuo.ai",
] as const;
export const VEO_MEDIA_HOSTS = ["googleapis.com", "googleusercontent.com"] as const;

export function isAllowedHeygenMediaUrl(url: string): boolean {
  return hostAllowed(url, HEYGEN_MEDIA_HOSTS);
}

export function isAllowedMinimaxMediaUrl(url: string): boolean {
  return hostAllowed(url, MINIMAX_MEDIA_HOSTS);
}

export function isAllowedVeoMediaUrl(url: string): boolean {
  return hostAllowed(url, VEO_MEDIA_HOSTS);
}

export function isAllowedRemoteMediaUrl(url: string): boolean {
  return isAllowedHeygenMediaUrl(url) || isAllowedMinimaxMediaUrl(url) || isAllowedVeoMediaUrl(url);
}

export function isAllowedCharacterImageUrl(url: string): boolean {
  try {
    parsePublicHttpsUrl(url, "Ảnh nhân vật");
    return true;
  } catch {
    return false;
  }
}

export function withGoogleApiKey(url: string, apiKey: string): string {
  const parsed = parsePublicHttpsUrl(url, "Veo video");
  if (!isAllowedVeoMediaUrl(parsed.toString())) {
    throw new Error("Veo trả URL không hợp lệ");
  }
  if (!parsed.searchParams.has("key")) {
    parsed.searchParams.set("key", apiKey);
  }
  return parsed.toString();
}
