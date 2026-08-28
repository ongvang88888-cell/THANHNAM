import { classifyLanding, safeLandingHref, urlsFromSavedCopy } from "./landing";

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

export function isYoutubeVideoId(value: string): boolean {
  return VIDEO_ID.test(value);
}

/**
 * Video id from a user-saved YouTube URL. No network.
 * watch?v= / youtu.be / embed / shorts / live / /v/
 */
export function extractYoutubeVideoId(raw: string | null | undefined): string | null {
  const href = safeLandingHref(raw);
  if (!href || classifyLanding(href) !== "youtube") {
    return null;
  }
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0] ?? "";
    return isYoutubeVideoId(id) ? id : null;
  }
  const fromQuery = url.searchParams.get("v")?.trim() ?? "";
  if (isYoutubeVideoId(fromQuery)) {
    return fromQuery;
  }
  const parts = url.pathname.split("/").filter(Boolean);
  const marked = parts.findIndex((part) => part === "embed" || part === "shorts" || part === "live" || part === "v");
  if (marked >= 0) {
    const id = parts[marked + 1] ?? "";
    return isYoutubeVideoId(id) ? id : null;
  }
  return null;
}

export function collectYoutubeVideoIds(urls: readonly (string | null | undefined)[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of urls) {
    const id = extractYoutubeVideoId(raw);
    if (!id || seen.has(id)) {
      continue;
    }
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export type YoutubeViewCount = {
  videoId: string;
  viewCount: number;
};

/** Parse official videos.list JSON. Ignore missing / non-numeric statistics. */
export function parseYoutubeVideosList(payload: unknown): YoutubeViewCount[] {
  if (typeof payload !== "object" || payload === null || !("items" in payload)) {
    return [];
  }
  const items = (payload as { items: unknown }).items;
  if (!Array.isArray(items)) {
    return [];
  }
  const out: YoutubeViewCount[] = [];
  for (const item of items) {
    if (typeof item !== "object" || item === null) {
      continue;
    }
    const row = item as { id?: unknown; statistics?: { viewCount?: unknown } };
    const videoId = typeof row.id === "string" ? row.id : "";
    if (!isYoutubeVideoId(videoId)) {
      continue;
    }
    const raw = row.statistics?.viewCount;
    const viewCount = typeof raw === "string" ? Number(raw) : typeof raw === "number" ? raw : NaN;
    if (!Number.isInteger(viewCount) || viewCount < 0 || viewCount > 50_000_000_000) {
      continue;
    }
    out.push({ videoId, viewCount });
  }
  return out;
}

export function mapYoutubeVideosToClusters(
  ads: ReadonlyArray<{
    clusterSlug: string;
    landingUrl?: string | null;
    body?: string | null;
    title?: string | null;
  }>,
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const ad of ads) {
    const urls = urlsFromSavedCopy(ad.landingUrl, ad.body, ad.title);
    for (const id of collectYoutubeVideoIds(urls)) {
      const prev = map.get(id) ?? [];
      if (!prev.includes(ad.clusterSlug)) {
        map.set(id, [...prev, ad.clusterSlug]);
      }
    }
  }
  return map;
}

export function peakViewsByCluster(
  videoToClusters: ReadonlyMap<string, readonly string[]>,
  counts: readonly YoutubeViewCount[],
): Array<{ clusterSlug: string; viewCount: number }> {
  const peak = new Map<string, number>();
  for (const row of counts) {
    const clusters = videoToClusters.get(row.videoId) ?? [];
    for (const slug of clusters) {
      const prev = peak.get(slug);
      if (prev === undefined || row.viewCount > prev) {
        peak.set(slug, row.viewCount);
      }
    }
  }
  return [...peak.entries()].map(([clusterSlug, viewCount]) => ({ clusterSlug, viewCount }));
}
