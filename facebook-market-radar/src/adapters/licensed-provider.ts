import { filterNormalizedAds, parseLicensedFeed } from "../domain/licensed-feed";
import type { AdIndexQuery, IAdIndexProvider, NormalizedAd } from "../domain/ports";

export interface LicensedFeedReader {
  read(): Promise<unknown>;
}

export class EmptyLicensedFeedReader implements LicensedFeedReader {
  async read(): Promise<unknown> {
    return { ads: [] };
  }
}

export class JsonLicensedFeedReader implements LicensedFeedReader {
  constructor(private readonly json: string) {}

  async read(): Promise<unknown> {
    return JSON.parse(this.json) as unknown;
  }
}

export class LicensedAdIndexProvider implements IAdIndexProvider {
  readonly source = "licensed" as const;

  constructor(private readonly reader: LicensedFeedReader) {}

  async fetchAds(query: AdIndexQuery): Promise<NormalizedAd[]> {
    const raw = await this.reader.read();
    const parsed = parseLicensedFeed(raw);
    if (!parsed.ok) {
      throw new Error(parsed.error);
    }
    return filterNormalizedAds(parsed.ads, {
      libraryId: query.libraryId,
      pageId: query.pageId,
      searchText: query.searchText,
    });
  }
}
