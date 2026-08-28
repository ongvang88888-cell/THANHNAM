import { isYoutubeVideoId } from "./youtube-video";

export type YoutubeSearchHit = {
  videoId: string;
  title: string;
};

/** Parse official search.list JSON. Ignore channels/playlists. */
export function parseYoutubeSearchList(payload: unknown): YoutubeSearchHit[] {
  if (typeof payload !== "object" || payload === null || !("items" in payload)) {
    return [];
  }
  const items = (payload as { items: unknown }).items;
  if (!Array.isArray(items)) {
    return [];
  }
  const out: YoutubeSearchHit[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (typeof item !== "object" || item === null) {
      continue;
    }
    const row = item as {
      id?: { videoId?: unknown; kind?: unknown };
      snippet?: { title?: unknown };
    };
    const videoId = typeof row.id?.videoId === "string" ? row.id.videoId : "";
    if (!isYoutubeVideoId(videoId) || seen.has(videoId)) {
      continue;
    }
    const title = typeof row.snippet?.title === "string" ? row.snippet.title.trim() : "";
    seen.add(videoId);
    out.push({ videoId, title });
  }
  return out;
}

export function sanitizeYoutubeSearchQuery(title: string): string {
  return title
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}
