import type {
  IRadarRepository,
  StoredAd,
  StoredAdTag,
  StoredAlert,
  StoredBoard,
  StoredBoardItem,
  StoredCluster,
  StoredPage,
  StoredPageWatch,
  StoredOwnShopItem,
  StoredResearchLink,
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
  private readonly pageWatches = new Map<string, StoredPageWatch>();
  private readonly boards = new Map<string, StoredBoard>();
  private readonly boardItems: StoredBoardItem[] = [];
  private readonly tags: StoredAdTag[] = [];
  private readonly researchLinks: Array<{ appId: string; row: StoredResearchLink }> = [];
  private readonly ownShop: Array<{ appId: string; row: StoredOwnShopItem }> = [];

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

  async upsertPageWatch(appId: string, row: StoredPageWatch): Promise<void> {
    this.pageWatches.set(key(appId, row.pageId), row);
  }

  async listPageWatches(appId: string): Promise<StoredPageWatch[]> {
    return [...this.pageWatches.entries()]
      .filter(([k]) => k.startsWith(`${appId}::`))
      .map(([, v]) => v)
      .sort((a, b) => b.createdMs - a.createdMs);
  }

  async deletePageWatch(appId: string, pageId: string): Promise<void> {
    this.pageWatches.delete(key(appId, pageId));
  }

  async upsertBoard(appId: string, row: StoredBoard): Promise<void> {
    this.boards.set(key(appId, row.slug), row);
  }

  async listBoards(appId: string): Promise<StoredBoard[]> {
    return [...this.boards.entries()]
      .filter(([k]) => k.startsWith(`${appId}::`))
      .map(([, v]) => v)
      .sort((a, b) => b.createdMs - a.createdMs);
  }

  async deleteBoard(appId: string, slug: string): Promise<void> {
    this.boards.delete(key(appId, slug));
    for (let i = this.boardItems.length - 1; i >= 0; i -= 1) {
      if (this.boardItems[i]?.boardSlug === slug) {
        this.boardItems.splice(i, 1);
      }
    }
  }

  async addBoardItem(appId: string, row: StoredBoardItem): Promise<void> {
    const exists = this.boardItems.some(
      (item) => item.boardSlug === row.boardSlug && item.libraryId === row.libraryId,
    );
    if (!exists) {
      this.boardItems.push(row);
    }
    void appId;
  }

  async listBoardItems(appId: string, boardSlug?: string): Promise<StoredBoardItem[]> {
    void appId;
    return this.boardItems.filter((item) => !boardSlug || item.boardSlug === boardSlug);
  }

  async removeBoardItem(appId: string, boardSlug: string, libraryId: string): Promise<void> {
    void appId;
    const idx = this.boardItems.findIndex(
      (item) => item.boardSlug === boardSlug && item.libraryId === libraryId,
    );
    if (idx >= 0) {
      this.boardItems.splice(idx, 1);
    }
  }

  async replaceAdTags(appId: string, libraryId: string, tags: string[]): Promise<void> {
    void appId;
    for (let i = this.tags.length - 1; i >= 0; i -= 1) {
      if (this.tags[i]?.libraryId === libraryId) {
        this.tags.splice(i, 1);
      }
    }
    for (const tag of tags) {
      this.tags.push({ libraryId, tag });
    }
  }

  async listAdTags(appId: string): Promise<StoredAdTag[]> {
    void appId;
    return [...this.tags];
  }

  async upsertResearchLink(appId: string, row: StoredResearchLink): Promise<boolean> {
    const exists = this.researchLinks.some(
      (item) =>
        item.appId === appId &&
        item.row.clusterSlug === row.clusterSlug &&
        item.row.platform === row.platform &&
        item.row.url === row.url,
    );
    if (exists) {
      return false;
    }
    this.researchLinks.push({ appId, row });
    return true;
  }

  async listResearchLinks(appId: string): Promise<StoredResearchLink[]> {
    return this.researchLinks.filter((item) => item.appId === appId).map((item) => item.row);
  }

  async upsertOwnShopItem(appId: string, row: StoredOwnShopItem): Promise<void> {
    const idx = this.ownShop.findIndex(
      (item) =>
        item.appId === appId &&
        item.row.platform === row.platform &&
        item.row.shopId === row.shopId &&
        item.row.itemId === row.itemId &&
        item.row.date === row.date,
    );
    if (idx >= 0) {
      this.ownShop[idx] = { appId, row };
      return;
    }
    this.ownShop.push({ appId, row });
  }

  async listOwnShopItems(appId: string): Promise<StoredOwnShopItem[]> {
    return this.ownShop.filter((item) => item.appId === appId).map((item) => item.row);
  }
}
