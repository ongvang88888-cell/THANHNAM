/** First hop in X-Forwarded-For, then Express req.ip. Used behind Caddy. */
export function throttleTracker(req: {
  headers?: Record<string, unknown>;
  ips?: unknown;
  ip?: unknown;
}): string {
  const forwarded = req.headers?.["x-forwarded-for"];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  if (typeof raw === "string" && raw.trim()) {
    return raw.split(",")[0].trim();
  }
  if (Array.isArray(req.ips) && typeof req.ips[0] === "string" && req.ips[0]) {
    return req.ips[0];
  }
  return typeof req.ip === "string" && req.ip ? req.ip : "unknown";
}
