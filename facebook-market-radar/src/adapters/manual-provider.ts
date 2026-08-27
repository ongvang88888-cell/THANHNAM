import { filterNormalizedAds } from "../domain/licensed-feed";
import type { AdIndexQuery, IAdIndexProvider, NormalizedAd } from "../domain/ports";

export class ManualAdIndexProvider implements IAdIndexProvider {
  readonly source = "manual" as const;

  constructor(private readonly ads: readonly NormalizedAd[]) {}

  async fetchAds(query: AdIndexQuery): Promise<NormalizedAd[]> {
    return filterNormalizedAds([...this.ads], {
      libraryId: query.libraryId,
      pageId: query.pageId,
      searchText: query.searchText,
    });
  }
}
