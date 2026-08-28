import type { IYoutubeSearchProvider, IYoutubeViewsProvider, YoutubeSearchVideo } from "../domain/ports";
import { assertOfficialStatsUrl } from "../domain/official-stats-host";
import { parseYoutubeSearchList, sanitizeYoutubeSearchQuery } from "../domain/youtube-search";
import { isYoutubeVideoId, parseYoutubeVideosList, type YoutubeViewCount } from "../domain/youtube-video";

const VIDEOS_ENDPOINT = "https://www.googleapis.com/youtube/v3/videos";
const SEARCH_ENDPOINT = "https://www.googleapis.com/youtube/v3/search";
const MAX_IDS = 50;

export type YoutubeHttp = (input: string, init: RequestInit) => Promise<Response>;

function uniqueVideoIds(ids: readonly string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of ids) {
    const id = raw.trim();
    if (!isYoutubeVideoId(id) || seen.has(id)) {
      continue;
    }
    seen.add(id);
    out.push(id);
  }
  return out;
}

function chunks<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

export class YoutubeDataApiProvider implements IYoutubeViewsProvider, IYoutubeSearchProvider {
  constructor(
    private readonly apiKey: string | undefined,
    private readonly http: YoutubeHttp = fetch,
  ) {}

  get enabled(): boolean {
    return Boolean(this.apiKey?.trim());
  }

  private requireKey(): string {
    const key = this.apiKey?.trim() ?? "";
    if (!key) {
      throw new Error(
        "Chưa cấu hình YOUTUBE_API_KEY — chỉ gọi googleapis.com, không scrape youtube.com",
      );
    }
    return key;
  }

  private async getJson(href: string): Promise<unknown> {
    const checked = assertOfficialStatsUrl(href);
    if (!checked.ok) {
      throw new Error(checked.error);
    }
    const response = await this.http(checked.href, {
      method: "GET",
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      throw new Error("YouTube Data API không trả dữ liệu — kiểm tra khóa và hạn ngạch");
    }
    return response.json();
  }

  async fetchViewCounts(videoIds: readonly string[]): Promise<YoutubeViewCount[]> {
    const key = this.requireKey();
    const ids = uniqueVideoIds(videoIds);
    const out: YoutubeViewCount[] = [];
    for (const group of chunks(ids, MAX_IDS)) {
      const url = new URL(VIDEOS_ENDPOINT);
      url.searchParams.set("part", "statistics");
      url.searchParams.set("id", group.join(","));
      url.searchParams.set("key", key);
      const payload = await this.getJson(url.toString());
      out.push(...parseYoutubeVideosList(payload));
    }
    return out;
  }

  async searchVideos(query: string, maxResults: number): Promise<YoutubeSearchVideo[]> {
    const key = this.requireKey();
    const q = sanitizeYoutubeSearchQuery(query);
    if (!q) {
      return [];
    }
    const limit = Math.min(5, Math.max(1, Math.floor(maxResults)));
    const searchUrl = new URL(SEARCH_ENDPOINT);
    searchUrl.searchParams.set("part", "snippet");
    searchUrl.searchParams.set("type", "video");
    searchUrl.searchParams.set("maxResults", String(limit));
    searchUrl.searchParams.set("q", q);
    searchUrl.searchParams.set("relevanceLanguage", "vi");
    searchUrl.searchParams.set("regionCode", "VN");
    searchUrl.searchParams.set("key", key);
    const hits = parseYoutubeSearchList(await this.getJson(searchUrl.toString()));
    if (hits.length === 0) {
      return [];
    }
    const counts = await this.fetchViewCounts(hits.map((hit) => hit.videoId));
    const viewById = new Map(counts.map((row) => [row.videoId, row.viewCount]));
    return hits.flatMap((hit) => {
      const viewCount = viewById.get(hit.videoId);
      if (viewCount === undefined) {
        return [];
      }
      return [{ videoId: hit.videoId, title: hit.title, viewCount }];
    });
  }
}
