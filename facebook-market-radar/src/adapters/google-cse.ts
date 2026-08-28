import type { IListingSearchProvider, ListingSearchHit } from "../domain/ports";
import {
  cseQueryForSite,
  parseGoogleCseItems,
  type ListingSearchSite,
} from "../domain/google-cse";
import { assertOfficialStatsUrl } from "../domain/official-stats-host";

const ENDPOINT = "https://www.googleapis.com/customsearch/v1";

export type CseHttp = (input: string, init: RequestInit) => Promise<Response>;

export class GoogleCseListingProvider implements IListingSearchProvider {
  constructor(
    private readonly apiKey: string | undefined,
    private readonly cx: string | undefined,
    private readonly http: CseHttp = fetch,
  ) {}

  get enabled(): boolean {
    return Boolean(this.apiKey?.trim() && this.cx?.trim());
  }

  async searchOfficialListings(input: {
    query: string;
    site: ListingSearchSite;
  }): Promise<ListingSearchHit[]> {
    const key = this.apiKey?.trim() ?? "";
    const cx = this.cx?.trim() ?? "";
    if (!key || !cx) {
      throw new Error(
        "Chưa cấu hình GOOGLE_CSE_KEY + GOOGLE_CSE_CX — chỉ lấy URL listing qua Custom Search, không scrape sàn",
      );
    }
    const q = cseQueryForSite(input.query, input.site);
    const url = new URL(ENDPOINT);
    url.searchParams.set("key", key);
    url.searchParams.set("cx", cx);
    url.searchParams.set("q", q);
    url.searchParams.set("num", "3");
    url.searchParams.set("hl", "vi");
    url.searchParams.set("gl", "vn");
    const checked = assertOfficialStatsUrl(url.toString());
    if (!checked.ok) {
      throw new Error(checked.error);
    }
    const response = await this.http(checked.href, {
      method: "GET",
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      throw new Error("Google Custom Search không trả link — kiểm tra khóa, CX và hạn ngạch");
    }
    const payload: unknown = await response.json();
    return parseGoogleCseItems(payload, input.site);
  }
}
