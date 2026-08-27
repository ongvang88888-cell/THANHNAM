import type {
  IRadarRepository,
  StoredAd,
  StoredAlert,
  StoredCluster,
  StoredPage,
  StoredSalesProxy,
  StoredSnapshot,
  StoredWatch,
} from "../application/repository";
import type { OwnCampaignInsight } from "../domain/ports";

function key(appId: string, ...parts: string[]): string {
  return [appId, ...parts].join("::");
}

export class MemoryRadarRepository implements IRadarRepository {
  private readonly pages = new Map<string, StoredPage>();
  private readonly clusters = new Map<string, StoredCluster>();
  private readonly ads = new Map<string, StoredAd>();
  private readonly proxies: Array<{ appId: string; row: StoredSalesProxy }> = [];
  private readonly snapshots = new Map<string, StoredSnapshot[]>();
  private readonly alerts = new Map<string, StoredAlert[]>();
  private readonly insights = new Map<string, OwnCampaignInsight>();
  private readonly watches = new Map<string, StoredWatch>();

  async upsertPage(appId: string, page: StoredPage): Promise<void> {
    this.pages.set(key(appId, page.pageId), page);
  }

  async getPage(appId: string, pageId: string): Promise<StoredPage | null> {
    return this.pages.get(key(appId, pageId)) ?? null;
  }

  async listPages(appId: string): Promise<StoredPage[]> {
    return [...this.pages.entries()]
      .filter(([k]) => k.startsWith(`${appId}::`))
      .map(([, v]) => v);
  }

  async upsertCluster(appId: string, cluster: StoredCluster): Promise<void> {
    this.clusters.set(key(appId, cluster.slug), cluster);
  }

  async listClusters(appId: string): Promise<StoredCluster[]> {
    return [...this.clusters.entries()]
      .filter(([k]) => k.startsWith(`${appId}::`))
      .map(([, v]) => v);
  }

  async upsertAd(appId: string, ad: StoredAd): Promise<void> {
    this.ads.set(key(appId, ad.libraryId), ad);
  }

  async listAds(appId: string): Promise<StoredAd[]> {
    return [...this.ads.entries()]
      .filter(([k]) => k.startsWith(`${appId}::`))
      .map(([, v]) => v);
  }

  async addSalesProxy(appId: string, row: StoredSalesProxy): Promise<void> {
    this.proxies.push({ appId, row });
  }

  async listSalesProxies(appId: string): Promise<StoredSalesProxy[]> {
    return this.proxies.filter((item) => item.appId === appId).map((item) => item.row);
  }

  async replaceSnapshots(appId: string, weekStartMs: number, rows: StoredSnapshot[]): Promise<void> {
    this.snapshots.set(key(appId, String(weekStartMs)), rows);
  }

  async listSnapshots(appId: string, weekStartMs: number): Promise<StoredSnapshot[]> {
    return this.snapshots.get(key(appId, String(weekStartMs))) ?? [];
  }

  async replaceAlerts(appId: string, rows: StoredAlert[]): Promise<void> {
    this.alerts.set(appId, rows);
  }

  async listAlerts(appId: string): Promise<StoredAlert[]> {
    return this.alerts.get(appId) ?? [];
  }

  async upsertOwnInsight(appId: string, row: OwnCampaignInsight): Promise<void> {
    this.insights.set(key(appId, row.adAccountId, row.date, row.campaignId), row);
  }

  async listOwnInsights(appId: string): Promise<OwnCampaignInsight[]> {
    return [...this.insights.entries()]
      .filter(([k]) => k.startsWith(`${appId}::`))
      .map(([, v]) => v);
  }

  async upsertWatch(appId: string, row: StoredWatch): Promise<void> {
    this.watches.set(key(appId, row.slug), row);
  }

  async listWatches(appId: string): Promise<StoredWatch[]> {
    return [...this.watches.entries()]
      .filter(([k]) => k.startsWith(`${appId}::`))
      .map(([, v]) => v)
      .sort((a, b) => b.createdMs - a.createdMs);
  }

  async deleteWatch(appId: string, slug: string): Promise<void> {
    this.watches.delete(key(appId, slug));
  }
}
