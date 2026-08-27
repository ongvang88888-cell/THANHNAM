import type { AlertType } from "../domain/alerts";
import type { OwnCampaignInsight } from "../domain/ports";

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
  creativeHash: string;
  firstSeenMs: number;
  lastSeenMs: number;
  clusterSlug: string;
};

export type StoredCluster = {
  slug: string;
  title: string;
  nicheSlug: string;
};

export type StoredSalesProxy = {
  clusterSlug: string;
  source: "SHOPEE" | "TIKTOK";
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

export type StoredAlert = {
  type: AlertType;
  title: string;
  detail: string;
  pageId: string | null;
  clusterSlug: string | null;
  createdMs: number;
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
}
