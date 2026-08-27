import { detectAlerts, creativeHash, type AlertDraft } from "../domain/alerts";
import { assertCollectAuthorized } from "../domain/authz";
import { draftCluster, shouldMergeClusters, slugifyTitle } from "../domain/clustering";
import { validateCollectManual, type CollectManualInput } from "../domain/collect-input";
import { buildIndustryStats, catalogCoverage, type CatalogCoverage, type IndustryStat } from "../domain/industry-stats";
import { nicheName } from "../domain/niches";
import { estimateProductPrice } from "../domain/price";
import { productImagePath, uniqueImageUrls } from "../domain/product-image";
import { analyzeProductName, type ProductAdAnalysis } from "../domain/product-watch";
import { scoreHeat } from "../domain/scoring";
import { buildClusterSignals, maxSold } from "../domain/signals";
import { weekStartUtc } from "../domain/week";
import { buildWeeklyReportMarkdown, type RankingRow } from "../domain/weekly-report";
import { summarizeOwnInsights } from "../domain/own-insights";
import type { IOwnAdsInsightsProvider } from "../domain/ports";
import type {
  IRadarRepository,
  StoredAd,
  StoredAlert,
  StoredCluster,
  StoredSnapshot,
  StoredWatch,
} from "./repository";

export const DEFAULT_APP_ID = "fmr_vn";

export class RadarService {
  constructor(
    private readonly repo: IRadarRepository,
    private readonly appId: string = DEFAULT_APP_ID,
  ) {}

  async collectManual(
    input: CollectManualInput,
    nowMs: number,
    collectKey: string | null,
    expectedKey: string | undefined,
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
    if (parsed.shopeeSold !== null) {
      await this.repo.addSalesProxy(this.appId, {
        clusterSlug: cluster.slug,
        source: "SHOPEE",
        soldCount: parsed.shopeeSold,
        observedMs: nowMs,
      });
    }
    if (parsed.tiktokSold !== null) {
      await this.repo.addSalesProxy(this.appId, {
        clusterSlug: cluster.slug,
        source: "TIKTOK",
        soldCount: parsed.tiktokSold,
        observedMs: nowMs,
      });
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
      const sold = maxSold(
        proxies.filter((p) => p.clusterSlug === cluster.slug).map((p) => p.soldCount),
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
    const uniqueAlerts = uniqueAlertDrafts(alertDrafts).map((draft) => ({
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

  async listClusters(): Promise<StoredCluster[]> {
    return this.repo.listClusters(this.appId);
  }

  async listAlerts(): Promise<StoredAlert[]> {
    const alerts = await this.repo.listAlerts(this.appId);
    return [...alerts].sort((a, b) => b.createdMs - a.createdMs);
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
