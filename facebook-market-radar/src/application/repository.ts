import type { AlertType } from "../domain/alerts";
import type { OwnCampaignInsight } from "../domain/ports";
import type { ResearchLinkSource } from "../domain/platform-stats-plan";
import type { ChannelMetricSource } from "../domain/sales-channels";
import type { OwnShopPlatform } from "../domain/own-shop";

export type StoredPage = {
  pageId: string;
  pageName: string;
  firstSeenMs: number;
  lastSeenMs: number;
};

export type StoredAd = {
  libraryId: string;
  pageId: string;
  startDate: string;
  isActive: boolean;
  platforms: string[];
  body: string | null;
  title: string | null;
  landingUrl: string | null;
  snapshotUrl: string | null;
  imageUrl: string | null;
  listingPriceVnd: number | null;
  creativeHash: string;
  firstSeenMs: number;
  lastSeenMs: number;
  clusterSlug: string;
};

export type StoredCluster = {
  slug: string;
  title: string;
  nicheSlug: string;
  imageUrl: string | null;
};

export type StoredSalesProxy = {
  clusterSlug: string;
  source: ChannelMetricSource;
  soldCount: number;
  observedMs: number;
};

export type StoredSnapshot = {
  clusterSlug: string;
  weekStartMs: number;
  intensity: number;
  longevity: number;
  velocity: number;
  salesProxy: number;
  heat: number;
  activeAdCount: number;
  distinctPageCount: number;
};

export type StoredWatch = {
  slug: string;
  name: string;
  note: string | null;
  createdMs: number;
};

export type StoredPageWatch = {
  pageId: string;
  pageName: string | null;
  note: string | null;
  createdMs: number;
};

export type StoredBoard = {
  slug: string;
  name: string;
  note: string | null;
  createdMs: number;
};

export type StoredBoardItem = {
  boardSlug: string;
  libraryId: string;
  clusterSlug: string;
  createdMs: number;
};

export type StoredAdTag = {
  libraryId: string;
  tag: string;
};

export type StoredAlert = {
  type: AlertType;
  title: string;
  detail: string;
  pageId: string | null;
  clusterSlug: string | null;
  createdMs: number;
};

export type StoredResearchLink = {
  clusterSlug: string;
  platform: string;
  url: string;
  title: string | null;
  source: ResearchLinkSource;
  createdMs: number;
};

export type StoredOwnShopItem = {
  platform: OwnShopPlatform;
  shopId: string;
  itemId: string;
  itemName: string;
  soldCount: number;
  date: string;
};

export interface IRadarRepository {
  upsertPage(appId: string, page: StoredPage): Promise<void>;
  getPage(appId: string, pageId: string): Promise<StoredPage | null>;
  upsertCluster(appId: string, cluster: StoredCluster): Promise<void>;
  listClusters(appId: string): Promise<StoredCluster[]>;
  upsertAd(appId: string, ad: StoredAd): Promise<void>;
  listAds(appId: string): Promise<StoredAd[]>;
  addSalesProxy(appId: string, row: StoredSalesProxy): Promise<void>;
  listSalesProxies(appId: string): Promise<StoredSalesProxy[]>;
  replaceSnapshots(appId: string, weekStartMs: number, rows: StoredSnapshot[]): Promise<void>;
  listSnapshots(appId: string, weekStartMs: number): Promise<StoredSnapshot[]>;
  replaceAlerts(appId: string, rows: StoredAlert[]): Promise<void>;
  listAlerts(appId: string): Promise<StoredAlert[]>;
  upsertOwnInsight(appId: string, row: OwnCampaignInsight): Promise<void>;
  listOwnInsights(appId: string): Promise<OwnCampaignInsight[]>;
  listPages(appId: string): Promise<StoredPage[]>;
  upsertWatch(appId: string, row: StoredWatch): Promise<void>;
  listWatches(appId: string): Promise<StoredWatch[]>;
  deleteWatch(appId: string, slug: string): Promise<void>;
  upsertPageWatch(appId: string, row: StoredPageWatch): Promise<void>;
  listPageWatches(appId: string): Promise<StoredPageWatch[]>;
  deletePageWatch(appId: string, pageId: string): Promise<void>;
  upsertBoard(appId: string, row: StoredBoard): Promise<void>;
  listBoards(appId: string): Promise<StoredBoard[]>;
  deleteBoard(appId: string, slug: string): Promise<void>;
  addBoardItem(appId: string, row: StoredBoardItem): Promise<void>;
  listBoardItems(appId: string, boardSlug?: string): Promise<StoredBoardItem[]>;
  removeBoardItem(appId: string, boardSlug: string, libraryId: string): Promise<void>;
  replaceAdTags(appId: string, libraryId: string, tags: string[]): Promise<void>;
  listAdTags(appId: string): Promise<StoredAdTag[]>;
  upsertResearchLink(appId: string, row: StoredResearchLink): Promise<boolean>;
  listResearchLinks(appId: string): Promise<StoredResearchLink[]>;
  upsertOwnShopItem(appId: string, row: StoredOwnShopItem): Promise<void>;
  listOwnShopItems(appId: string): Promise<StoredOwnShopItem[]>;
}
