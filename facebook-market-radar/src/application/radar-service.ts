import { detectAlerts, creativeHash, type AlertDraft } from "../domain/alerts";
import { buildScanLookup, buildScanPlan, type ScanLookup, type ScanPlan } from "../domain/ad-library-scan";
import { isCreativeAngle } from "../domain/creative-angles";
import {
  megaScanCount,
  megaScanCountsByNiche,
  pageMegaScan,
  type MegaScanPage,
} from "../domain/mega-scan";
import { assertCollectAuthorized } from "../domain/authz";
import { draftCluster, shouldMergeClusters, slugifyTitle } from "../domain/clustering";
import { validateCollectManual, type CollectManualInput } from "../domain/collect-input";
import { buildIndustryStats, catalogCoverage, type CatalogCoverage, type IndustryStat } from "../domain/industry-stats";
import { nicheName } from "../domain/niches";
import { estimateProductPrice } from "../domain/price";
import { productImagePath, uniqueImageUrls } from "../domain/product-image";
import { analyzeProductName, type ProductAdAnalysis } from "../domain/product-watch";
import {
  enrichResearchRow,
  filterResearchRows,
  hookDigest,
  buildProductDossier,
  sanitizeUserTags,
  splitTrendLanes,
  watchedPageNewAdAlerts,
  type HookDigestRow,
  type ProductDossier,
  type ResearchRow,
  type SavedAdLite,
  type SavedFilter,
} from "../domain/saved-research";
import {
  buildChannelAnalysisRow,
  heatEligibleSold,
  normalizeChannelObservations,
  sortChannelAnalysis,
  type ChannelAnalysisRow,
} from "../domain/channel-analysis";
import {
  buildPlatformDashboard,
  parsePlatformTab,
  type PlatformDashboard,
  type PlatformTabId,
} from "../domain/platform-dashboards";
import {
  buildPlatformBestsellerPage,
  type PlatformBestsellerPage,
} from "../domain/platform-bestsellers";
import {
  parseChannelMetricSource,
  type ChannelMetricSource,
  type ChannelSort,
} from "../domain/sales-channels";
import { scoreHeat } from "../domain/scoring";
import { rankStrongProducts } from "../domain/strong-ads";
import { parseAdLibrarySheet } from "../domain/sheet-import";
import { buildClusterSignals } from "../domain/signals";
import { weekStartUtc } from "../domain/week";
import { buildWeeklyReportMarkdown, type RankingRow } from "../domain/weekly-report";
import { summarizeOwnInsights } from "../domain/own-insights";
import type { IOwnAdsInsightsProvider, IYoutubeViewsProvider, NormalizedAd } from "../domain/ports";
import { urlsFromSavedCopy } from "../domain/landing";
import { mapYoutubeVideosToClusters, peakViewsByCluster } from "../domain/youtube-video";
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
  StoredSnapshot,
  StoredWatch,
} from "./repository";

const ID_RE = /^[0-9A-Za-z._-]{1,64}$/;

export type CollectExtras = {
  watchPage?: boolean;
  tags?: string[];
};

export const DEFAULT_APP_ID = "fmr_vn";

export type YoutubeViewsRefreshResult = {
  updated: number;
  skipped: number;
  videoCount: number;
  viewsEnterHeat: false;
  enabled: boolean;
};

export class RadarService {
  constructor(
    private readonly repo: IRadarRepository,
    private readonly appId: string = DEFAULT_APP_ID,
    private readonly youtubeViews?: IYoutubeViewsProvider,
  ) {}

  async collectManual(
    input: CollectManualInput,
    nowMs: number,
    collectKey: string | null,
    expectedKey: string | undefined,
    extras: CollectExtras = {},
  ): Promise<{ libraryId: string; clusterSlug: string }> {
    assertCollectAuthorized(collectKey, expectedKey);
    const parsed = validateCollectManual(input);
    if (!parsed.ok) {
      throw new Error(parsed.error);
    }
    const draft = draftCluster(parsed.productTitle, parsed.nicheSlug);
    let cluster = await this.resolveCluster(draft.title, draft.slug, draft.nicheSlug);
    const startMs = Date.parse(`${parsed.ad.startDate}T00:00:00.000Z`);
    const observedMs = Number.isFinite(startMs) ? Math.min(nowMs, startMs) : nowMs;
    const existingPage = await this.repo.getPage(this.appId, parsed.ad.pageId);
    const pageFirstSeen = existingPage?.firstSeenMs ?? observedMs;
    await this.repo.upsertPage(this.appId, {
      pageId: parsed.ad.pageId,
      pageName: parsed.ad.pageName,
      firstSeenMs: pageFirstSeen,
      lastSeenMs: nowMs,
    });
    const hash = creativeHash({
      libraryId: parsed.ad.libraryId,
      body: parsed.ad.body,
      title: parsed.ad.title,
    });
    const imageUrl =
      parsed.imageUrl ??
      parsed.ad.imageUrl ??
      productImagePath(cluster.slug, cluster.title, cluster.nicheSlug);
    if (!cluster.imageUrl) {
      cluster = { ...cluster, imageUrl };
      await this.repo.upsertCluster(this.appId, cluster);
    }
    const existingAd = (await this.repo.listAds(this.appId)).find(
      (ad) => ad.libraryId === parsed.ad.libraryId,
    );
    await this.repo.upsertAd(this.appId, {
      libraryId: parsed.ad.libraryId,
      pageId: parsed.ad.pageId,
      startDate: parsed.ad.startDate,
      isActive: parsed.ad.isActive,
      platforms: parsed.ad.platforms,
      body: parsed.ad.body,
      title: parsed.ad.title,
      landingUrl: parsed.ad.landingUrl,
      snapshotUrl: parsed.sourceUrl,
      imageUrl,
      listingPriceVnd: parsed.listingPriceVnd,
      creativeHash: hash,
      firstSeenMs: existingAd?.firstSeenMs ?? observedMs,
      lastSeenMs: nowMs,
      clusterSlug: cluster.slug,
    });
    for (const observation of parsed.observations) {
      await this.repo.addSalesProxy(this.appId, {
        clusterSlug: cluster.slug,
        source: observation.source,
        soldCount: observation.value,
        observedMs: nowMs,
      });
    }
    if (extras.watchPage) {
      const existingWatch = (await this.repo.listPageWatches(this.appId)).find(
        (row) => row.pageId === parsed.ad.pageId,
      );
      await this.repo.upsertPageWatch(this.appId, {
        pageId: parsed.ad.pageId,
        pageName: parsed.ad.pageName,
        note: existingWatch?.note ?? null,
        createdMs: existingWatch?.createdMs ?? nowMs,
      });
    }
    const tags = sanitizeUserTags(extras.tags ?? []);
    if (tags.length > 0) {
      await this.repo.replaceAdTags(this.appId, parsed.ad.libraryId, tags);
    }
    await this.recompute(nowMs);
    return { libraryId: parsed.ad.libraryId, clusterSlug: cluster.slug };
  }

  async recompute(nowMs: number): Promise<void> {
    const ads = await this.repo.listAds(this.appId);
    const clusters = await this.repo.listClusters(this.appId);
    const pages = await this.repo.listPages(this.appId);
    const proxies = await this.repo.listSalesProxies(this.appId);
    const weekStartMs = weekStartUtc(nowMs).getTime();
    const snapshots: StoredSnapshot[] = [];
    const alertDrafts: AlertDraft[] = [];

    for (const cluster of clusters) {
      const clusterAds = ads.filter((ad) => ad.clusterSlug === cluster.slug);
      const sold = heatEligibleSold(
        normalizeChannelObservations(proxies.filter((p) => p.clusterSlug === cluster.slug)),
      );
      const signals = buildClusterSignals(
        clusterAds.map((ad) => ({
          isActive: ad.isActive,
          pageId: ad.pageId,
          creativeHash: ad.creativeHash,
          startDate: ad.startDate,
        })),
        nowMs,
        sold,
      );
      const scores = scoreHeat(signals);
      snapshots.push({
        clusterSlug: cluster.slug,
        weekStartMs,
        intensity: scores.intensity,
        longevity: scores.longevity,
        velocity: scores.velocity,
        salesProxy: scores.salesProxy,
        heat: scores.heat,
        activeAdCount: signals.activeAdCount,
        distinctPageCount: signals.distinctPageCount,
      });

      const previousWeekNew = clusterAds.filter((ad) => {
        const age = nowMs - Date.parse(ad.startDate);
        return age >= 7 * 86_400_000 && age < 14 * 86_400_000;
      }).length;

      for (const ad of clusterAds) {
        const page = pages.find((p) => p.pageId === ad.pageId);
        if (!page) continue;
        alertDrafts.push(
          ...detectAlerts({
            pageId: page.pageId,
            pageName: page.pageName,
            pageFirstSeenMs: page.firstSeenMs,
            creativeHash: ad.creativeHash,
            creativeFirstSeenMs: ad.firstSeenMs,
            clusterSlug: cluster.slug,
            newAdsLast7Days: signals.newAdsLast7Days,
            previousWeekNewAds: previousWeekNew,
            nowMs,
          }),
        );
      }
    }

    await this.repo.replaceSnapshots(this.appId, weekStartMs, snapshots);
    const pageWatches = await this.repo.listPageWatches(this.appId);
    const watchAlerts: AlertDraft[] = watchedPageNewAdAlerts(pageWatches, ads, pages, nowMs).map(
      (row) => ({
        type: "WATCHED_PAGE_NEW_AD" as const,
        title: row.title,
        detail: row.detail,
        pageId: row.pageId,
        clusterSlug: row.clusterSlug,
      }),
    );
    const uniqueAlerts = uniqueAlertDrafts([...alertDrafts, ...watchAlerts]).map((draft) => ({
      ...draft,
      createdMs: nowMs,
    }));
    await this.repo.replaceAlerts(this.appId, uniqueAlerts);
  }

  async listRankings(nowMs: number, nicheSlug?: string): Promise<RankingRow[]> {
    const weekStartMs = weekStartUtc(nowMs).getTime();
    let snapshots = await this.repo.listSnapshots(this.appId, weekStartMs);
    if (snapshots.length === 0) {
      await this.recompute(nowMs);
      snapshots = await this.repo.listSnapshots(this.appId, weekStartMs);
    }
    const clusters = await this.repo.listClusters(this.appId);
    const ads = await this.repo.listAds(this.appId);
    const rows: RankingRow[] = [];
    for (const snap of snapshots) {
      const cluster = clusters.find((c) => c.slug === snap.clusterSlug);
      if (!cluster) continue;
      if (nicheSlug && cluster.nicheSlug !== nicheSlug) continue;
      const clusterAds = ads.filter((ad) => ad.clusterSlug === cluster.slug);
      const fallback = productImagePath(cluster.slug, cluster.title, cluster.nicheSlug);
      rows.push({
        clusterSlug: cluster.slug,
        clusterTitle: cluster.title,
        nicheSlug: cluster.nicheSlug,
        nicheName: nicheName(cluster.nicheSlug),
        activeAdCount: snap.activeAdCount,
        totalAdCount: clusterAds.length,
        distinctPageCount: snap.distinctPageCount,
        imageUrls: uniqueImageUrls([
          cluster.imageUrl,
          ...clusterAds.map((ad) => ad.imageUrl),
          fallback,
        ]),
        price: estimateProductPrice({
          title: cluster.title,
          nicheSlug: cluster.nicheSlug,
          listingPricesVnd: clusterAds.map((ad) => ad.listingPriceVnd),
          copyTexts: clusterAds.flatMap((ad) => [ad.body, ad.title, cluster.title]),
        }),
        scores: {
          intensity: snap.intensity,
          longevity: snap.longevity,
          velocity: snap.velocity,
          salesProxy: snap.salesProxy,
          heat: snap.heat,
          estimated: true,
        },
      });
    }
    return rows.sort((a, b) => b.scores.heat - a.scores.heat);
  }

  async industryOverview(nowMs: number): Promise<{
    industries: IndustryStat[];
    coverage: CatalogCoverage;
  }> {
    const rankings = await this.listRankings(nowMs);
    const industries = buildIndustryStats(rankings);
    return { industries, coverage: catalogCoverage(industries) };
  }

  async listAds(): Promise<StoredAd[]> {
    return this.repo.listAds(this.appId);
  }

  async listPages(): Promise<StoredPage[]> {
    return this.repo.listPages(this.appId);
  }

  async listClusters(): Promise<StoredCluster[]> {
    return this.repo.listClusters(this.appId);
  }

  async listAlerts(): Promise<StoredAlert[]> {
    const alerts = await this.repo.listAlerts(this.appId);
    return [...alerts].sort((a, b) => b.createdMs - a.createdMs);
  }

  async listResearch(nowMs: number, filter: SavedFilter = {}): Promise<ResearchRow[]> {
    const rankings = await this.listRankings(nowMs, filter.niche);
    const ads = await this.savedAdsLite();
    const rows = rankings.map((row) => enrichResearchRow(row, ads, nowMs));
    return filterResearchRows(rows, filter);
  }

  async getProductDossier(slug: string, nowMs: number): Promise<ProductDossier | null> {
    const trimmed = slug.trim();
    if (!trimmed) {
      return null;
    }
    const rankings = await this.listRankings(nowMs);
    const row = rankings.find((item) => item.clusterSlug === trimmed);
    if (!row) {
      return null;
    }
    const ads = await this.savedAdsLite();
    return buildProductDossier(enrichResearchRow(row, ads, nowMs), ads, nowMs);
  }

  async compareProducts(
    leftSlug: string,
    rightSlug: string,
    nowMs: number,
  ): Promise<{ left: ProductDossier | null; right: ProductDossier | null }> {
    return {
      left: await this.getProductDossier(leftSlug, nowMs),
      right: await this.getProductDossier(rightSlug, nowMs),
    };
  }

  async listTrendLanes(nowMs: number): Promise<{
    trending: ResearchRow[];
    fresh: ResearchRow[];
    hooks: HookDigestRow[];
  }> {
    const rows = await this.listResearch(nowMs);
    const ads = await this.savedAdsLite();
    const clusters = await this.repo.listClusters(this.appId);
    const nicheByCluster = new Map(clusters.map((cluster) => [cluster.slug, cluster.nicheSlug]));
    return {
      ...splitTrendLanes(rows),
      hooks: hookDigest(ads, nicheByCluster),
    };
  }

  async listStrongProducts(nowMs: number, nicheSlug?: string): Promise<ResearchRow[]> {
    const rows = await this.listResearch(nowMs, { niche: nicheSlug });
    return rankStrongProducts(rows);
  }

  async listChannelAnalysis(
    nowMs: number,
    sort: ChannelSort = "tong",
    nicheSlug?: string,
  ): Promise<ChannelAnalysisRow[]> {
    const research = await this.listResearch(nowMs, { niche: nicheSlug });
    const ads = await this.repo.listAds(this.appId);
    const observations = normalizeChannelObservations(await this.repo.listSalesProxies(this.appId));
    const landingByCluster = new Map<string, Array<string | null>>();
    const platformsByCluster = new Map<string, string[]>();
    const lastSeenByCluster = new Map<string, number>();
    for (const ad of ads) {
      const urls = landingByCluster.get(ad.clusterSlug) ?? [];
      urls.push(...urlsFromSavedCopy(ad.landingUrl, ad.body, ad.title));
      landingByCluster.set(ad.clusterSlug, urls);
      const platforms = platformsByCluster.get(ad.clusterSlug) ?? [];
      platforms.push(...ad.platforms);
      platformsByCluster.set(ad.clusterSlug, platforms);
      lastSeenByCluster.set(
        ad.clusterSlug,
        Math.max(lastSeenByCluster.get(ad.clusterSlug) ?? 0, ad.lastSeenMs),
      );
    }
    const rows = research.map((row) =>
      buildChannelAnalysisRow(row, observations, landingByCluster.get(row.clusterSlug) ?? [], {
        platforms: platformsByCluster.get(row.clusterSlug) ?? [],
        lastSeenMs: lastSeenByCluster.get(row.clusterSlug) ?? row.lastSeenMs,
      }),
    );
    return sortChannelAnalysis(rows, sort);
  }

  async listPlatformDashboard(
    nowMs: number,
    tab: string | PlatformTabId = "facebook",
    nicheSlug?: string,
  ): Promise<PlatformDashboard> {
    const parsed = parsePlatformTab(typeof tab === "string" ? tab : tab);
    const rows = await this.listChannelAnalysis(nowMs, "tong", nicheSlug);
    const observations = normalizeChannelObservations(await this.repo.listSalesProxies(this.appId));
    const titleBySlug = new Map(rows.map((row) => [row.clusterSlug, row.clusterTitle]));
    return buildPlatformDashboard({
      rows,
      observations,
      tab: parsed,
      nowMs,
      titleBySlug,
    });
  }

  async listPlatformBestsellers(
    nowMs: number,
    tab: string | PlatformTabId = "shopee",
    opts: { niche?: string; q?: string; trang?: number } = {},
  ): Promise<PlatformBestsellerPage> {
    const warehouse = await this.listChannelAnalysis(nowMs, "tong");
    return buildPlatformBestsellerPage({
      tab,
      niche: opts.niche,
      q: opts.q,
      trang: opts.trang,
      warehouse,
    });
  }

  async getClusterChannelRow(slug: string, nowMs: number): Promise<ChannelAnalysisRow | null> {
    const trimmed = slug.trim();
    if (!trimmed) {
      return null;
    }
    const rows = await this.listChannelAnalysis(nowMs, "tong");
    return rows.find((row) => row.clusterSlug === trimmed) ?? null;
  }

  async recordChannelObservation(
    input: { clusterSlug: string; source: string; value: number },
    nowMs: number,
    collectKey: string | null,
    expectedKey: string | undefined,
  ): Promise<{ clusterSlug: string; source: ChannelMetricSource; value: number }> {
    assertCollectAuthorized(collectKey, expectedKey);
    const source = parseChannelMetricSource(input.source);
    if (!source) {
      throw new Error("Nguồn chỉ số không hợp lệ");
    }
    if (!Number.isInteger(input.value) || input.value < 0 || input.value > 50_000_000) {
      throw new Error("chỉ số kênh phải là số nguyên 0–50000000");
    }
    const slug = input.clusterSlug.trim();
    if (!slug) {
      throw new Error("clusterSlug bắt buộc");
    }
    const clusters = await this.repo.listClusters(this.appId);
    if (!clusters.some((cluster) => cluster.slug === slug)) {
      throw new Error("Sản phẩm chưa có trong kho — lưu ads trước");
    }
    await this.repo.addSalesProxy(this.appId, {
      clusterSlug: slug,
      source,
      soldCount: input.value,
      observedMs: nowMs,
    });
    await this.recompute(nowMs);
    return { clusterSlug: slug, source, value: input.value };
  }

  async refreshYoutubeViewsFromWarehouse(
    nowMs: number,
    collectKey: string | null,
    expectedKey: string | undefined,
  ): Promise<YoutubeViewsRefreshResult> {
    assertCollectAuthorized(collectKey, expectedKey);
    if (!this.youtubeViews?.enabled) {
      throw new Error(
        "Chưa cấu hình YOUTUBE_API_KEY — chỉ lấy view của video ID đã có trên thẻ đã lưu, không scrape youtube.com",
      );
    }
    const ads = await this.repo.listAds(this.appId);
    const mapping = mapYoutubeVideosToClusters(ads);
    const videoIds = [...mapping.keys()];
    if (videoIds.length === 0) {
      return { updated: 0, skipped: 0, videoCount: 0, viewsEnterHeat: false, enabled: true };
    }
    const counts = await this.youtubeViews.fetchViewCounts(videoIds);
    const peaks = peakViewsByCluster(mapping, counts);
    const existing = normalizeChannelObservations(await this.repo.listSalesProxies(this.appId));
    let updated = 0;
    let skipped = 0;
    for (const row of peaks) {
      const current = existing
        .filter((item) => item.clusterSlug === row.clusterSlug && item.source === "YOUTUBE_VIEWS")
        .reduce((max, item) => Math.max(max, item.value), -1);
      if (current === row.viewCount) {
        skipped += 1;
        continue;
      }
      await this.repo.addSalesProxy(this.appId, {
        clusterSlug: row.clusterSlug,
        source: "YOUTUBE_VIEWS",
        soldCount: row.viewCount,
        observedMs: nowMs,
      });
      updated += 1;
    }
    if (updated > 0) {
      await this.recompute(nowMs);
    }
    return { updated, skipped, videoCount: videoIds.length, viewsEnterHeat: false, enabled: true };
  }

  async listPageWatches(): Promise<StoredPageWatch[]> {
    return this.repo.listPageWatches(this.appId);
  }

  async upsertPageWatch(
    pageId: string,
    pageName: string | null,
    note: string | null,
    nowMs: number,
    collectKey: string | null,
    expectedKey: string | undefined,
  ): Promise<StoredPageWatch> {
    assertCollectAuthorized(collectKey, expectedKey);
    const trimmed = pageId.trim();
    if (!ID_RE.test(trimmed)) {
      throw new Error("pageId bắt buộc (id trang Facebook)");
    }
    const existing = (await this.repo.listPageWatches(this.appId)).find((row) => row.pageId === trimmed);
    const page = await this.repo.getPage(this.appId, trimmed);
    const watch: StoredPageWatch = {
      pageId: trimmed,
      pageName: pageName?.trim() || page?.pageName || existing?.pageName || null,
      note,
      createdMs: existing?.createdMs ?? nowMs,
    };
    await this.repo.upsertPageWatch(this.appId, watch);
    await this.recompute(nowMs);
    return watch;
  }

  async deletePageWatch(
    pageId: string,
    collectKey: string | null,
    expectedKey: string | undefined,
  ): Promise<void> {
    assertCollectAuthorized(collectKey, expectedKey);
    const trimmed = pageId.trim();
    if (!ID_RE.test(trimmed)) {
      throw new Error("pageId bắt buộc");
    }
    await this.repo.deletePageWatch(this.appId, trimmed);
  }

  async listBoards(): Promise<StoredBoard[]> {
    return this.repo.listBoards(this.appId);
  }

  async listBoardItems(boardSlug?: string): Promise<StoredBoardItem[]> {
    return this.repo.listBoardItems(this.appId, boardSlug);
  }

  async upsertBoard(
    name: string,
    note: string | null,
    nowMs: number,
    collectKey: string | null,
    expectedKey: string | undefined,
  ): Promise<StoredBoard> {
    assertCollectAuthorized(collectKey, expectedKey);
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 80) {
      throw new Error("Tên bộ sưu tập phải từ 2–80 ký tự");
    }
    const slug = slugifyTitle(trimmed);
    const existing = (await this.repo.listBoards(this.appId)).find((row) => row.slug === slug);
    const board: StoredBoard = {
      slug,
      name: trimmed,
      note,
      createdMs: existing?.createdMs ?? nowMs,
    };
    await this.repo.upsertBoard(this.appId, board);
    return board;
  }

  async deleteBoard(
    slug: string,
    collectKey: string | null,
    expectedKey: string | undefined,
  ): Promise<void> {
    assertCollectAuthorized(collectKey, expectedKey);
    const trimmed = slug.trim();
    if (!trimmed) {
      throw new Error("slug bắt buộc");
    }
    await this.repo.deleteBoard(this.appId, trimmed);
  }

  async addBoardItem(
    boardSlug: string,
    libraryId: string,
    nowMs: number,
    collectKey: string | null,
    expectedKey: string | undefined,
  ): Promise<StoredBoardItem> {
    assertCollectAuthorized(collectKey, expectedKey);
    const slug = boardSlug.trim();
    const id = libraryId.trim();
    if (!slug) {
      throw new Error("boardSlug bắt buộc");
    }
    if (!ID_RE.test(id)) {
      throw new Error("libraryId bắt buộc");
    }
    const boards = await this.repo.listBoards(this.appId);
    if (!boards.some((board) => board.slug === slug)) {
      throw new Error("Bộ sưu tập không tồn tại");
    }
    const ad = (await this.repo.listAds(this.appId)).find((row) => row.libraryId === id);
    if (!ad) {
      throw new Error("Thẻ chưa lưu — lưu quảng cáo trước khi ghim");
    }
    const item: StoredBoardItem = {
      boardSlug: slug,
      libraryId: id,
      clusterSlug: ad.clusterSlug,
      createdMs: nowMs,
    };
    await this.repo.addBoardItem(this.appId, item);
    return item;
  }

  async removeBoardItem(
    boardSlug: string,
    libraryId: string,
    collectKey: string | null,
    expectedKey: string | undefined,
  ): Promise<void> {
    assertCollectAuthorized(collectKey, expectedKey);
    await this.repo.removeBoardItem(this.appId, boardSlug.trim(), libraryId.trim());
  }

  async listAdTags(): Promise<StoredAdTag[]> {
    return this.repo.listAdTags(this.appId);
  }

  async replaceAdTags(
    libraryId: string,
    tags: string[],
    collectKey: string | null,
    expectedKey: string | undefined,
  ): Promise<string[]> {
    assertCollectAuthorized(collectKey, expectedKey);
    const id = libraryId.trim();
    if (!ID_RE.test(id)) {
      throw new Error("libraryId bắt buộc");
    }
    const ad = (await this.repo.listAds(this.appId)).find((row) => row.libraryId === id);
    if (!ad) {
      throw new Error("Thẻ chưa lưu");
    }
    const clean = sanitizeUserTags(tags);
    await this.repo.replaceAdTags(this.appId, id, clean);
    return clean;
  }

  private async savedAdsLite(): Promise<SavedAdLite[]> {
    const ads = await this.repo.listAds(this.appId);
    const tags = await this.repo.listAdTags(this.appId);
    const anglesById = new Map<string, SavedAdLite["userAngles"]>();
    for (const tag of tags) {
      if (!isCreativeAngle(tag.tag)) {
        continue;
      }
      const prev = anglesById.get(tag.libraryId) ?? [];
      anglesById.set(tag.libraryId, [...prev, tag.tag]);
    }
    return ads.map((ad) => ({
      libraryId: ad.libraryId,
      pageId: ad.pageId,
      clusterSlug: ad.clusterSlug,
      startDate: ad.startDate,
      isActive: ad.isActive,
      body: ad.body,
      title: ad.title,
      landingUrl: ad.landingUrl,
      imageUrl: ad.imageUrl,
      listingPriceVnd: ad.listingPriceVnd,
      firstSeenMs: ad.firstSeenMs,
      lastSeenMs: ad.lastSeenMs,
      userAngles: anglesById.get(ad.libraryId),
    }));
  }

  async analyzeProductName(query: string): Promise<ProductAdAnalysis> {
    const clusters = await this.repo.listClusters(this.appId);
    const ads = await this.repo.listAds(this.appId);
    return analyzeProductName(
      query,
      clusters.map((cluster) => ({
        slug: cluster.slug,
        title: cluster.title,
        nicheSlug: cluster.nicheSlug,
        ads: ads
          .filter((ad) => ad.clusterSlug === cluster.slug)
          .map((ad) => ({
            isActive: ad.isActive,
            pageId: ad.pageId,
            listingPriceVnd: ad.listingPriceVnd,
            body: ad.body,
            title: ad.title,
          })),
      })),
    );
  }

  async upsertWatch(
    name: string,
    note: string | null,
    nowMs: number,
    collectKey: string | null,
    expectedKey: string | undefined,
  ): Promise<{ watch: StoredWatch; analysis: ProductAdAnalysis }> {
    assertCollectAuthorized(collectKey, expectedKey);
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 200) {
      throw new Error("Tên sản phẩm phải từ 2–200 ký tự");
    }
    const analysis = await this.analyzeProductName(trimmed);
    const slug = analysis.slug || slugifyTitle(trimmed);
    const existing = (await this.repo.listWatches(this.appId)).find((row) => row.slug === slug);
    const watch: StoredWatch = {
      slug,
      name: trimmed,
      note,
      createdMs: existing?.createdMs ?? nowMs,
    };
    await this.repo.upsertWatch(this.appId, watch);
    return { watch, analysis };
  }

  async listWatchesWithAnalysis(): Promise<Array<StoredWatch & { analysis: ProductAdAnalysis }>> {
    const watches = await this.repo.listWatches(this.appId);
    const rows: Array<StoredWatch & { analysis: ProductAdAnalysis }> = [];
    for (const watch of watches) {
      rows.push({ ...watch, analysis: await this.analyzeProductName(watch.name) });
    }
    return rows;
  }

  async deleteWatch(
    slug: string,
    collectKey: string | null,
    expectedKey: string | undefined,
  ): Promise<void> {
    assertCollectAuthorized(collectKey, expectedKey);
    const trimmed = slug.trim();
    if (!trimmed) {
      throw new Error("slug bắt buộc");
    }
    await this.repo.deleteWatch(this.appId, trimmed);
  }

  async scanPlan(nowMs: number, nextBatchSize = 20): Promise<ScanPlan> {
    const rankings = await this.listRankings(nowMs);
    const clusters = await this.repo.listClusters(this.appId);
    const ads = await this.repo.listAds(this.appId);
    const extraTexts: string[] = [];
    const nicheBySlug = new Map(clusters.map((cluster) => [cluster.slug, cluster.nicheSlug]));
    for (const cluster of clusters) {
      extraTexts.push(cluster.title);
    }
    for (const ad of ads) {
      if (ad.title) {
        extraTexts.push(ad.title);
      }
      if (ad.body) {
        extraTexts.push(ad.body);
      }
    }
    for (const watch of await this.repo.listWatches(this.appId)) {
      extraTexts.push(watch.name);
    }
    return buildScanPlan(
      rankings,
      extraTexts,
      undefined,
      nextBatchSize,
      ads.map((ad) => ({
        nicheSlug: nicheBySlug.get(ad.clusterSlug) ?? "khac",
        title: ad.title,
        body: ad.body,
        isActive: ad.isActive,
      })),
    );
  }

  megaScanOverview(): {
    total: number;
    byNiche: Array<{ nicheSlug: string; nicheName: string; count: number }>;
  } {
    return { total: megaScanCount(), byNiche: megaScanCountsByNiche() };
  }

  pageMegaScan(input: {
    offset?: number;
    limit?: number;
    nicheSlug?: string;
    q?: string;
  }): MegaScanPage {
    return pageMegaScan(input);
  }

  async lookupScan(query: string): Promise<ScanLookup> {
    const trimmed = query.trim();
    if (trimmed.length < 2 || trimmed.length > 200) {
      throw new Error("Tên / từ khóa phải từ 2–200 ký tự");
    }
    const analysis = await this.analyzeProductName(trimmed);
    return buildScanLookup(trimmed, analysis);
  }

  async collectSheet(
    csv: string,
    nowMs: number,
    collectKey: string | null,
    expectedKey: string | undefined,
  ): Promise<{ imported: number; skipped: number; failed: number; errors: string[] }> {
    assertCollectAuthorized(collectKey, expectedKey);
    if (csv.trim().length === 0) {
      throw new Error("CSV trống");
    }
    if (csv.length > 400_000) {
      throw new Error("CSV quá lớn (tối đa ~400KB)");
    }
    const parsed = parseAdLibrarySheet(csv);
    if (parsed.rows.length > 200) {
      throw new Error("Tối đa 200 dòng mỗi lần nhập");
    }
    if (parsed.rows.length === 0) {
      throw new Error(parsed.errors[0] ?? "Không có dòng hợp lệ");
    }
    const errors = [...parsed.errors];
    let imported = 0;
    let failed = 0;
    for (const row of parsed.rows) {
      try {
        await this.collectManual(row, nowMs, collectKey, expectedKey);
        imported += 1;
      } catch (error) {
        failed += 1;
        errors.push(
          `${row.libraryId ?? "?"}: ${error instanceof Error ? error.message : "Không lưu được"}`,
        );
      }
    }
    return { imported, skipped: parsed.skipped, failed, errors };
  }

  async importNormalizedAds(
    ads: NormalizedAd[],
    nowMs: number,
    collectKey: string | null,
    expectedKey: string | undefined,
  ): Promise<{ imported: number; failed: number; errors: string[] }> {
    assertCollectAuthorized(collectKey, expectedKey);
    if (ads.length > 10_000) {
      throw new Error("Tối đa 10000 ads mỗi lần nhập licensed");
    }
    const errors: string[] = [];
    let imported = 0;
    let failed = 0;
    for (const ad of ads) {
      try {
        await this.collectManual(
          {
            snapshot: ad,
            productTitle: ad.productHint ?? ad.title ?? ad.pageName,
            nicheSlug: ad.nicheHint ?? undefined,
          },
          nowMs,
          collectKey,
          expectedKey,
        );
        imported += 1;
      } catch (error) {
        failed += 1;
        errors.push(`${ad.libraryId}: ${error instanceof Error ? error.message : "Không lưu được"}`);
      }
    }
    return { imported, failed, errors };
  }

  async warehouseStats(): Promise<{
    adCount: number;
    activeAdCount: number;
    pageCount: number;
    productCount: number;
    nicheCount: number;
  }> {
    const [ads, pages, clusters] = await Promise.all([
      this.repo.listAds(this.appId),
      this.repo.listPages(this.appId),
      this.repo.listClusters(this.appId),
    ]);
    const niches = new Set(clusters.map((cluster) => cluster.nicheSlug));
    return {
      adCount: ads.length,
      activeAdCount: ads.filter((ad) => ad.isActive).length,
      pageCount: pages.length,
      productCount: clusters.length,
      nicheCount: niches.size,
    };
  }

  async weeklyReport(nowMs: number): Promise<string> {
    const rankings = await this.listRankings(nowMs);
    const ads = await this.repo.listAds(this.appId);
    const pages = await this.repo.listPages(this.appId);
    const clusters = await this.repo.listClusters(this.appId);
    const industries = buildIndustryStats(rankings);
    return buildWeeklyReportMarkdown({
      nowMs,
      adCount: ads.length,
      pageCount: pages.length,
      clusterCount: clusters.length,
      rankings,
      industries,
    });
  }

  async syncOwnInsights(
    provider: IOwnAdsInsightsProvider,
    adAccountId: string,
    since: string,
    until: string,
    collectKey: string | null,
    expectedKey: string | undefined,
  ): Promise<number> {
    assertCollectAuthorized(collectKey, expectedKey);
    const rows = await provider.fetchInsights({ adAccountId, since, until });
    for (const row of rows) {
      await this.repo.upsertOwnInsight(this.appId, row);
    }
    return rows.length;
  }

  async ownInsightsSummary() {
    const rows = await this.repo.listOwnInsights(this.appId);
    return { rows, totals: summarizeOwnInsights(rows) };
  }

  private async resolveCluster(
    title: string,
    slug: string,
    nicheSlug: string,
  ): Promise<StoredCluster> {
    const existing = await this.repo.listClusters(this.appId);
    const merge = existing.find((c) => shouldMergeClusters(c.title, title));
    if (merge) {
      return merge;
    }
    const cluster = { slug, title, nicheSlug, imageUrl: null };
    await this.repo.upsertCluster(this.appId, cluster);
    return cluster;
  }
}

function uniqueAlertDrafts(drafts: AlertDraft[]): AlertDraft[] {
  const seen = new Set<string>();
  const out: AlertDraft[] = [];
  for (const draft of drafts) {
    const id = `${draft.type}:${draft.pageId ?? ""}:${draft.clusterSlug ?? ""}:${draft.title}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(draft);
  }
  return out;
}
