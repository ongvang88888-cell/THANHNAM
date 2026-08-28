export const AD_INDEX_SOURCES = ["manual", "licensed", "own_ads"] as const;
export type AdIndexSource = (typeof AD_INDEX_SOURCES)[number];

export const PUBLISHER_PLATFORMS = [
  "facebook",
  "instagram",
  "messenger",
  "audience_network",
  "threads",
] as const;
export type PublisherPlatform = (typeof PUBLISHER_PLATFORMS)[number];

export type AdIndexQuery = {
  country?: string;
  searchText?: string;
  pageId?: string;
  libraryId?: string;
  nowMs: number;
};

export type NormalizedAd = {
  libraryId: string;
  pageId: string;
  pageName: string;
  body: string | null;
  title: string | null;
  startDate: string;
  isActive: boolean;
  platforms: PublisherPlatform[];
  snapshotUrl: string | null;
  landingUrl: string | null;
  imageUrl: string | null;
  productHint: string | null;
  nicheHint: string | null;
};

export type OwnCampaignInsight = {
  adAccountId: string;
  campaignId: string;
  campaignName: string;
  date: string;
  spendMinor: number;
  impressions: number;
  purchases: number;
  purchaseValueMinor: number | null;
};

export interface IAdIndexProvider {
  readonly source: AdIndexSource;
  fetchAds(query: AdIndexQuery): Promise<NormalizedAd[]>;
}

export interface IOwnAdsInsightsProvider {
  readonly source: "own_ads";
  fetchInsights(input: {
    adAccountId: string;
    since: string;
    until: string;
  }): Promise<OwnCampaignInsight[]>;
}

/** Official YouTube Data API views for video IDs already on saved ads. Not youtube.com HTML. */
export interface IYoutubeViewsProvider {
  readonly enabled: boolean;
  fetchViewCounts(videoIds: readonly string[]): Promise<Array<{ videoId: string; viewCount: number }>>;
}

export type ClusterSignals = {
  activeAdCount: number;
  distinctPageCount: number;
  creativeVariantCount: number;
  adsAgeDays: number[];
  newAdsLast7Days: number;
  salesProxySold: number | null;
};

export type ScoreBreakdown = {
  intensity: number;
  longevity: number;
  velocity: number;
  salesProxy: number;
  heat: number;
  estimated: true;
};

export type HeatWeights = {
  intensity: number;
  longevity: number;
  velocity: number;
  salesProxy: number;
};

export const DEFAULT_HEAT_WEIGHTS: HeatWeights = {
  intensity: 0.35,
  longevity: 0.3,
  velocity: 0.2,
  salesProxy: 0.15,
};
