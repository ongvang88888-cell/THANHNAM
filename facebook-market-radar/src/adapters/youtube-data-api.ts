import type { IYoutubeViewsProvider } from "../domain/ports";
import { isYoutubeVideoId, parseYoutubeVideosList, type YoutubeViewCount } from "../domain/youtube-video";

const ENDPOINT = "https://www.googleapis.com/youtube/v3/videos";
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

export class YoutubeDataApiProvider implements IYoutubeViewsProvider {
  constructor(
    private readonly apiKey: string | undefined,
    private readonly http: YoutubeHttp = fetch,
  ) {}

  get enabled(): boolean {
    return Boolean(this.apiKey?.trim());
  }

  async fetchViewCounts(videoIds: readonly string[]): Promise<YoutubeViewCount[]> {
    const key = this.apiKey?.trim() ?? "";
    if (!key) {
      throw new Error(
        "Chưa cấu hình YOUTUBE_API_KEY — chỉ lấy view của video ID đã có trên thẻ đã lưu, không scrape youtube.com",
      );
    }
    const ids = uniqueVideoIds(videoIds);
    const out: YoutubeViewCount[] = [];
    for (const group of chunks(ids, MAX_IDS)) {
      const url = new URL(ENDPOINT);
      url.searchParams.set("part", "statistics");
      url.searchParams.set("id", group.join(","));
      url.searchParams.set("key", key);
      const response = await this.http(url.toString(), {
        method: "GET",
        redirect: "error",
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) {
        throw new Error("YouTube Data API không trả view — kiểm tra khóa và hạn ngạch");
      }
      const payload: unknown = await response.json();
      out.push(...parseYoutubeVideosList(payload));
    }
    return out;
  }
}
