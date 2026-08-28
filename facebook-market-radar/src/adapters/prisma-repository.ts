import type { PrismaClient } from "../generated/prisma";
import type {
  IRadarRepository,
  StoredAd,
  StoredAdTag,
  StoredAlert,
  StoredBoard,
  StoredBoardItem,
  StoredCluster,
  StoredOwnShopItem,
  StoredPage,
  StoredSummaryCycle,
  StoredPageWatch,
  StoredResearchLink,
  StoredSalesProxy,
  StoredSnapshot,
  StoredWatch,
} from "../application/repository";
import type { AlertType } from "../domain/alerts";
import { nicheName } from "../domain/niches";
import { LOCKED_NICHES } from "../domain/niches";
import { isOwnShopPlatform } from "../domain/own-shop";
import { isResearchLinkSource } from "../domain/platform-stats-plan";
import type { OwnCampaignInsight } from "../domain/ports";
import { parseChannelMetricSource } from "../domain/sales-channels";
import { SUMMARY_CYCLE_KEEP } from "../domain/summary-table";

export class PrismaRadarRepository implements IRadarRepository {
  constructor(private readonly db: PrismaClient) {}

  async upsertPage(appId: string, page: StoredPage): Promise<void> {
    await this.db.advertiserPage.upsert({
      where: { appId_pageId: { appId, pageId: page.pageId } },
      create: {
        appId,
        pageId: page.pageId,
        pageName: page.pageName,
        firstSeen: new Date(page.firstSeenMs),
        lastSeen: new Date(page.lastSeenMs),
      },
      update: {
        pageName: page.pageName,
        lastSeen: new Date(page.lastSeenMs),
      },
    });
  }

  async getPage(appId: string, pageId: string): Promise<StoredPage | null> {
    const row = await this.db.advertiserPage.findUnique({
      where: { appId_pageId: { appId, pageId } },
    });
    return row ? toPage(row) : null;
  }

  async listPages(appId: string): Promise<StoredPage[]> {
    const rows = await this.db.advertiserPage.findMany({ where: { appId } });
    return rows.map(toPage);
  }

  async upsertCluster(appId: string, cluster: StoredCluster): Promise<void> {
    const nicheMeta = LOCKED_NICHES.find((n) => n.slug === cluster.nicheSlug);
    const niche = await this.db.niche.upsert({
      where: { appId_slug: { appId, slug: cluster.nicheSlug } },
      create: {
        appId,
        slug: cluster.nicheSlug,
        nameVi: nicheMeta?.nameVi ?? nicheName(cluster.nicheSlug),
        nameEn: nicheMeta?.nameEn ?? cluster.nicheSlug,
      },
      update: {},
    });
    await this.db.productCluster.upsert({
      where: { appId_slug: { appId, slug: cluster.slug } },
      create: {
        appId,
        slug: cluster.slug,
        title: cluster.title,
        imageUrl: cluster.imageUrl,
        nicheId: niche.id,
      },
      update: {
        title: cluster.title,
        ...(cluster.imageUrl ? { imageUrl: cluster.imageUrl } : {}),
      },
    });
  }

  async listClusters(appId: string): Promise<StoredCluster[]> {
    const rows = await this.db.productCluster.findMany({
      where: { appId },
      include: { niche: true },
    });
    return rows.map((row) => ({
      slug: row.slug,
      title: row.title,
      nicheSlug: row.niche.slug,
      imageUrl: row.imageUrl,
    }));
  }

  async upsertAd(appId: string, ad: StoredAd): Promise<void> {
    const page = await this.db.advertiserPage.findUnique({
      where: { appId_pageId: { appId, pageId: ad.pageId } },
    });
    const cluster = await this.db.productCluster.findUnique({
      where: { appId_slug: { appId, slug: ad.clusterSlug } },
    });
    if (!page || !cluster) {
      throw new Error("Page hoặc cluster chưa được upsert trước ad");
    }
    const creative = await this.db.adCreative.upsert({
      where: { appId_hash: { appId, hash: ad.creativeHash } },
      create: { appId, hash: ad.creativeHash, body: ad.body, title: ad.title },
      update: { body: ad.body, title: ad.title },
    });
    const existing = await this.db.ad.findUnique({
      where: { appId_libraryId: { appId, libraryId: ad.libraryId } },
    });
    const saved = await this.db.ad.upsert({
      where: { appId_libraryId: { appId, libraryId: ad.libraryId } },
      create: {
        appId,
        libraryId: ad.libraryId,
        pageId: page.id,
        clusterId: cluster.id,
        creativeId: creative.id,
        startDate: ad.startDate,
        isActive: ad.isActive,
        platforms: JSON.stringify(ad.platforms),
        landingUrl: ad.landingUrl,
        snapshotUrl: ad.snapshotUrl,
        imageUrl: ad.imageUrl,
        listingPriceVnd: ad.listingPriceVnd,
        firstSeen: new Date(ad.firstSeenMs),
        lastSeen: new Date(ad.lastSeenMs),
      },
      update: {
        pageId: page.id,
        clusterId: cluster.id,
        creativeId: creative.id,
        startDate: ad.startDate,
        isActive: ad.isActive,
        platforms: JSON.stringify(ad.platforms),
        landingUrl: ad.landingUrl,
        snapshotUrl: ad.snapshotUrl,
        imageUrl: ad.imageUrl,
        listingPriceVnd: ad.listingPriceVnd,
        lastSeen: new Date(ad.lastSeenMs),
      },
    });
    await this.db.adProductLink.upsert({
      where: { adId_clusterId: { adId: saved.id, clusterId: cluster.id } },
      create: { adId: saved.id, clusterId: cluster.id },
      update: {},
    });
    if (existing && existing.firstSeen.getTime() !== ad.firstSeenMs) {
      await this.db.ad.update({
        where: { id: saved.id },
        data: { firstSeen: existing.firstSeen },
      });
    }
  }

  async listAds(appId: string): Promise<StoredAd[]> {
    const rows = await this.db.ad.findMany({
      where: { appId },
      include: { page: true, cluster: true, creative: true },
    });
    return rows.map((row) => ({
      libraryId: row.libraryId,
      pageId: row.page.pageId,
      startDate: row.startDate,
      isActive: row.isActive,
      platforms: parsePlatforms(row.platforms),
      body: row.creative.body,
      title: row.creative.title,
      landingUrl: row.landingUrl,
      snapshotUrl: row.snapshotUrl,
      imageUrl: row.imageUrl,
      listingPriceVnd: row.listingPriceVnd,
      creativeHash: row.creative.hash,
      firstSeenMs: row.firstSeen.getTime(),
      lastSeenMs: row.lastSeen.getTime(),
      clusterSlug: row.cluster.slug,
    }));
  }

  async addSalesProxy(appId: string, row: StoredSalesProxy): Promise<void> {
    const cluster = await this.db.productCluster.findUnique({
      where: { appId_slug: { appId, slug: row.clusterSlug } },
    });
    if (!cluster) {
      throw new Error("Cluster không tồn tại cho sales proxy");
    }
    await this.db.salesProxyObservation.create({
      data: {
        appId,
        clusterId: cluster.id,
        source: row.source,
        soldCount: row.soldCount,
        observedAt: new Date(row.observedMs),
      },
    });
  }

  async listSalesProxies(appId: string): Promise<StoredSalesProxy[]> {
    const rows = await this.db.salesProxyObservation.findMany({
      where: { appId },
      include: { cluster: true },
    });
    return rows.flatMap((row) => {
      const source = parseChannelMetricSource(row.source);
      if (!source) {
        return [];
      }
      return [
        {
          clusterSlug: row.cluster.slug,
          source,
          soldCount: row.soldCount,
          observedMs: row.observedAt.getTime(),
        },
      ];
    });
  }

  async replaceSnapshots(appId: string, weekStartMs: number, rows: StoredSnapshot[]): Promise<void> {
    const weekStart = new Date(weekStartMs);
    await this.db.marketSnapshot.deleteMany({ where: { appId, weekStart } });
    for (const row of rows) {
      const cluster = await this.db.productCluster.findUnique({
        where: { appId_slug: { appId, slug: row.clusterSlug } },
      });
      if (!cluster) continue;
      await this.db.marketSnapshot.create({
        data: {
          appId,
          clusterId: cluster.id,
          weekStart,
          intensity: row.intensity,
          longevity: row.longevity,
          velocity: row.velocity,
          salesProxy: row.salesProxy,
          heat: row.heat,
          activeAdCount: row.activeAdCount,
          distinctPageCount: row.distinctPageCount,
        },
      });
    }
  }

  async listSnapshots(appId: string, weekStartMs: number): Promise<StoredSnapshot[]> {
    const rows = await this.db.marketSnapshot.findMany({
      where: { appId, weekStart: new Date(weekStartMs) },
      include: { cluster: true },
    });
    return rows.map((row) => ({
      clusterSlug: row.cluster.slug,
      weekStartMs: row.weekStart.getTime(),
      intensity: row.intensity,
      longevity: row.longevity,
      velocity: row.velocity,
      salesProxy: row.salesProxy,
      heat: row.heat,
      activeAdCount: row.activeAdCount,
      distinctPageCount: row.distinctPageCount,
    }));
  }

  async replaceAlerts(appId: string, rows: StoredAlert[]): Promise<void> {
    await this.db.alert.deleteMany({ where: { appId } });
    if (rows.length === 0) {
      return;
    }
    await this.db.alert.createMany({
      data: rows.map((row) => ({
        appId,
        type: row.type,
        title: row.title,
        detail: row.detail,
        pageFbId: row.pageId,
        clusterSlug: row.clusterSlug,
        createdAt: new Date(row.createdMs),
      })),
    });
  }

  async listAlerts(appId: string): Promise<StoredAlert[]> {
    const rows = await this.db.alert.findMany({
      where: { appId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => ({
      type: row.type as AlertType,
      title: row.title,
      detail: row.detail,
      pageId: row.pageFbId,
      clusterSlug: row.clusterSlug,
      createdMs: row.createdAt.getTime(),
    }));
  }

  async upsertOwnInsight(appId: string, row: OwnCampaignInsight): Promise<void> {
    await this.db.ownInsightsDaily.upsert({
      where: {
        appId_adAccountId_date_campaignId: {
          appId,
          adAccountId: row.adAccountId,
          date: row.date,
          campaignId: row.campaignId,
        },
      },
      create: {
        appId,
        adAccountId: row.adAccountId,
        campaignId: row.campaignId,
        campaignName: row.campaignName,
        date: row.date,
        spendMinor: row.spendMinor,
        impressions: row.impressions,
        purchases: row.purchases,
        purchaseValueMinor: row.purchaseValueMinor,
      },
      update: {
        campaignName: row.campaignName,
        spendMinor: row.spendMinor,
        impressions: row.impressions,
        purchases: row.purchases,
        purchaseValueMinor: row.purchaseValueMinor,
      },
    });
  }

  async upsertWatch(appId: string, row: StoredWatch): Promise<void> {
    await this.db.productWatch.upsert({
      where: { appId_slug: { appId, slug: row.slug } },
      create: {
        appId,
        slug: row.slug,
        name: row.name,
        note: row.note,
        createdAt: new Date(row.createdMs),
      },
      update: {
        name: row.name,
        note: row.note,
      },
    });
  }

  async listWatches(appId: string): Promise<StoredWatch[]> {
    const rows = await this.db.productWatch.findMany({
      where: { appId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => ({
      slug: row.slug,
      name: row.name,
      note: row.note,
      createdMs: row.createdAt.getTime(),
    }));
  }

  async deleteWatch(appId: string, slug: string): Promise<void> {
    await this.db.productWatch.deleteMany({ where: { appId, slug } });
  }

  async listOwnInsights(appId: string): Promise<OwnCampaignInsight[]> {
    const rows = await this.db.ownInsightsDaily.findMany({ where: { appId } });
    return rows.map((row) => ({
      adAccountId: row.adAccountId,
      campaignId: row.campaignId,
      campaignName: row.campaignName,
      date: row.date,
      spendMinor: row.spendMinor,
      impressions: row.impressions,
      purchases: row.purchases,
      purchaseValueMinor: row.purchaseValueMinor,
    }));
  }

  async upsertPageWatch(appId: string, row: StoredPageWatch): Promise<void> {
    await this.db.pageWatch.upsert({
      where: { appId_pageId: { appId, pageId: row.pageId } },
      create: {
        appId,
        pageId: row.pageId,
        pageName: row.pageName,
        note: row.note,
        createdAt: new Date(row.createdMs),
      },
      update: {
        pageName: row.pageName,
        note: row.note,
      },
    });
  }

  async listPageWatches(appId: string): Promise<StoredPageWatch[]> {
    const rows = await this.db.pageWatch.findMany({
      where: { appId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => ({
      pageId: row.pageId,
      pageName: row.pageName,
      note: row.note,
      createdMs: row.createdAt.getTime(),
    }));
  }

  async deletePageWatch(appId: string, pageId: string): Promise<void> {
    await this.db.pageWatch.deleteMany({ where: { appId, pageId } });
  }

  async upsertBoard(appId: string, row: StoredBoard): Promise<void> {
    await this.db.creativeBoard.upsert({
      where: { appId_slug: { appId, slug: row.slug } },
      create: {
        appId,
        slug: row.slug,
        name: row.name,
        note: row.note,
        createdAt: new Date(row.createdMs),
      },
      update: {
        name: row.name,
        note: row.note,
      },
    });
  }

  async listBoards(appId: string): Promise<StoredBoard[]> {
    const rows = await this.db.creativeBoard.findMany({
      where: { appId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => ({
      slug: row.slug,
      name: row.name,
      note: row.note,
      createdMs: row.createdAt.getTime(),
    }));
  }

  async deleteBoard(appId: string, slug: string): Promise<void> {
    await this.db.creativeBoard.deleteMany({ where: { appId, slug } });
  }

  async addBoardItem(appId: string, row: StoredBoardItem): Promise<void> {
    const board = await this.db.creativeBoard.findUnique({
      where: { appId_slug: { appId, slug: row.boardSlug } },
    });
    if (!board) {
      throw new Error("Bộ sưu tập không tồn tại");
    }
    await this.db.boardItem.upsert({
      where: { boardId_libraryId: { boardId: board.id, libraryId: row.libraryId } },
      create: {
        appId,
        boardId: board.id,
        libraryId: row.libraryId,
        clusterSlug: row.clusterSlug,
        createdAt: new Date(row.createdMs),
      },
      update: { clusterSlug: row.clusterSlug },
    });
  }

  async listBoardItems(appId: string, boardSlug?: string): Promise<StoredBoardItem[]> {
    const rows = await this.db.boardItem.findMany({
      where: {
        appId,
        ...(boardSlug ? { board: { slug: boardSlug } } : {}),
      },
      include: { board: true },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => ({
      boardSlug: row.board.slug,
      libraryId: row.libraryId,
      clusterSlug: row.clusterSlug,
      createdMs: row.createdAt.getTime(),
    }));
  }

  async removeBoardItem(appId: string, boardSlug: string, libraryId: string): Promise<void> {
    const board = await this.db.creativeBoard.findUnique({
      where: { appId_slug: { appId, slug: boardSlug } },
    });
    if (!board) {
      return;
    }
    await this.db.boardItem.deleteMany({ where: { appId, boardId: board.id, libraryId } });
  }

  async replaceAdTags(appId: string, libraryId: string, tags: string[]): Promise<void> {
    await this.db.adTag.deleteMany({ where: { appId, libraryId } });
    if (tags.length === 0) {
      return;
    }
    await this.db.adTag.createMany({
      data: tags.map((tag) => ({ appId, libraryId, tag })),
    });
  }

  async listAdTags(appId: string): Promise<StoredAdTag[]> {
    const rows = await this.db.adTag.findMany({ where: { appId } });
    return rows.map((row) => ({ libraryId: row.libraryId, tag: row.tag }));
  }

  async upsertResearchLink(appId: string, row: StoredResearchLink): Promise<boolean> {
    const cluster = await this.db.productCluster.findUnique({
      where: { appId_slug: { appId, slug: row.clusterSlug } },
    });
    if (!cluster) {
      throw new Error("Cluster không tồn tại cho research link");
    }
    const existing = await this.db.clusterResearchLink.findUnique({
      where: {
        appId_clusterId_platform_url: {
          appId,
          clusterId: cluster.id,
          platform: row.platform,
          url: row.url,
        },
      },
    });
    if (existing) {
      return false;
    }
    await this.db.clusterResearchLink.create({
      data: {
        appId,
        clusterId: cluster.id,
        platform: row.platform,
        url: row.url,
        title: row.title,
        source: row.source,
      },
    });
    return true;
  }

  async listResearchLinks(appId: string): Promise<StoredResearchLink[]> {
    const rows = await this.db.clusterResearchLink.findMany({
      where: { appId },
      include: { cluster: true },
    });
    return rows.flatMap((row) => {
      if (!isResearchLinkSource(row.source)) {
        return [];
      }
      return [
        {
          clusterSlug: row.cluster.slug,
          platform: row.platform,
          url: row.url,
          title: row.title,
          source: row.source,
          createdMs: row.createdAt.getTime(),
        },
      ];
    });
  }

  async upsertOwnShopItem(appId: string, row: StoredOwnShopItem): Promise<void> {
    await this.db.ownShopDaily.upsert({
      where: {
        appId_platform_shopId_itemId_date: {
          appId,
          platform: row.platform,
          shopId: row.shopId,
          itemId: row.itemId,
          date: row.date,
        },
      },
      create: {
        appId,
        platform: row.platform,
        shopId: row.shopId,
        itemId: row.itemId,
        itemName: row.itemName,
        soldCount: row.soldCount,
        date: row.date,
      },
      update: {
        itemName: row.itemName,
        soldCount: row.soldCount,
      },
    });
  }

  async listOwnShopItems(appId: string): Promise<StoredOwnShopItem[]> {
    const rows = await this.db.ownShopDaily.findMany({ where: { appId } });
    return rows.flatMap((row) => {
      if (!isOwnShopPlatform(row.platform)) {
        return [];
      }
      return [
        {
          platform: row.platform,
          shopId: row.shopId,
          itemId: row.itemId,
          itemName: row.itemName,
          soldCount: row.soldCount,
          date: row.date,
        },
      ];
    });
  }

  async saveSummaryCycle(appId: string, row: StoredSummaryCycle): Promise<void> {
    await this.db.summaryCycle.create({
      data: {
        appId,
        capturedAt: new Date(row.capturedAtMs),
        nextDueAt: new Date(row.nextDueAtMs),
        rowCount: row.rowCount,
        filledCells: row.filledCells,
        emptyCells: row.emptyCells,
        apiRan: row.apiRan,
        payload: row.payloadJson,
      },
    });
    const stale = await this.db.summaryCycle.findMany({
      where: { appId },
      orderBy: { capturedAt: "desc" },
      skip: SUMMARY_CYCLE_KEEP,
      select: { id: true },
    });
    if (stale.length > 0) {
      await this.db.summaryCycle.deleteMany({
        where: { id: { in: stale.map((item) => item.id) } },
      });
    }
  }

  async getLatestSummaryCycle(appId: string): Promise<StoredSummaryCycle | null> {
    const row = await this.db.summaryCycle.findFirst({
      where: { appId },
      orderBy: { capturedAt: "desc" },
    });
    if (!row) {
      return null;
    }
    return {
      capturedAtMs: row.capturedAt.getTime(),
      nextDueAtMs: row.nextDueAt.getTime(),
      rowCount: row.rowCount,
      filledCells: row.filledCells,
      emptyCells: row.emptyCells,
      apiRan: row.apiRan,
      payloadJson: row.payload,
    };
  }
}

function toPage(row: {
  pageId: string;
  pageName: string;
  firstSeen: Date;
  lastSeen: Date;
}): StoredPage {
  return {
    pageId: row.pageId,
    pageName: row.pageName,
    firstSeenMs: row.firstSeen.getTime(),
    lastSeenMs: row.lastSeen.getTime(),
  };
}

function parsePlatforms(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return raw.split("|").filter(Boolean);
  }
}
