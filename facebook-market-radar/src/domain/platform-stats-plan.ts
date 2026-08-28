import type { ChannelAnalysisRow } from "./channel-analysis";
import { hasLandingPresence } from "./platform-dashboards";
import { LISTING_SEARCH_SITES, type ListingSearchSite } from "./google-cse";

export const YOUTUBE_SEARCH_CLUSTER_LIMIT = 8;
export const LISTING_SEARCH_QUERY_LIMIT = 12;
export const RESEARCH_LINK_SOURCES = ["youtube_search", "google_cse"] as const;
export type ResearchLinkSource = (typeof RESEARCH_LINK_SOURCES)[number];

export type YoutubeSearchJob = {
  clusterSlug: string;
  clusterTitle: string;
};

export type ListingSearchJob = {
  clusterSlug: string;
  clusterTitle: string;
  site: ListingSearchSite;
};

export function pickClustersForYoutubeSearch(
  rows: readonly ChannelAnalysisRow[],
  limit = YOUTUBE_SEARCH_CLUSTER_LIMIT,
): YoutubeSearchJob[] {
  const missing = rows.filter((row) => row.youtubeViews === null);
  missing.sort((a, b) => b.fbHeat - a.fbHeat || b.fbActiveAds - a.fbActiveAds);
  return missing.slice(0, Math.max(0, limit)).map((row) => ({
    clusterSlug: row.clusterSlug,
    clusterTitle: row.clusterTitle,
  }));
}

export function pickListingSearchJobs(
  rows: readonly ChannelAnalysisRow[],
  limit = LISTING_SEARCH_QUERY_LIMIT,
): ListingSearchJob[] {
  const ranked = [...rows].sort((a, b) => b.fbHeat - a.fbHeat || b.fbActiveAds - a.fbActiveAds);
  const out: ListingSearchJob[] = [];
  for (const site of LISTING_SEARCH_SITES) {
    for (const row of ranked) {
      if (out.length >= limit) {
        return out;
      }
      if (hasLandingPresence(row, site)) {
        continue;
      }
      out.push({
        clusterSlug: row.clusterSlug,
        clusterTitle: row.clusterTitle,
        site,
      });
    }
  }
  return out;
}

export function isResearchLinkSource(value: string): value is ResearchLinkSource {
  return (RESEARCH_LINK_SOURCES as readonly string[]).includes(value);
}
