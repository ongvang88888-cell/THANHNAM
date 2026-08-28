import { describe, expect, it } from "vitest";
import { MemoryRadarRepository } from "../adapters/memory-repository";
import {
  FixtureMarketingHttp,
  FIXTURE_GRAPH_INSIGHTS,
  OwnAdsMarketingApiProvider,
} from "../adapters/marketing-api-provider";
import { UnauthorizedError } from "../domain/authz";
import { scoreSalesProxy } from "../domain/scoring";
import { RadarService } from "./radar-service";

const now = Date.parse("2026-08-27T00:00:00.000Z");

async function seededService(): Promise<RadarService> {
  const repo = new MemoryRadarRepository();
  const service = new RadarService(repo);
  await service.collectManual(
    {
      libraryId: "111000021",
      pageId: "900021",
      pageName: "NhaGo Tien Ich",
      productTitle: "Đèn LED cảm ứng tủ bếp",
      startDate: "2026-05-20",
      nicheSlug: "gadget",
      listingPriceVnd: 79_000,
      body: "Đèn LED cảm ứng tủ bếp 79.000đ",
      shopeeSold: 6300,
    },
    now,
    null,
    undefined,
  );
  await service.collectManual(
    {
      libraryId: "111000022",
      pageId: "900022",
      pageName: "Smart Home Mini",
      productTitle: "Đèn LED cảm ứng tủ bếp",
      startDate: "2026-07-01",
      nicheSlug: "gadget",
      shopeeSold: 2100,
    },
    now,
    null,
    undefined,
  );
  await service.collectManual(
    {
      libraryId: "111000024",
      pageId: "900024",
      pageName: "TaiNghe Tot",
      productTitle: "Tai nghe chống ồn văn phòng",
      startDate: "2026-08-24",
      nicheSlug: "gadget",
    },
    now,
    null,
    undefined,
  );
  return service;
}

describe("RadarService", () => {
  it("clusters the same product and ranks by estimated heat", async () => {
    const service = await seededService();
    const rankings = await service.listRankings(now, "gadget");
    expect(rankings.length).toBeGreaterThanOrEqual(2);
    const led = rankings.find((r) => r.clusterTitle.includes("Đèn LED"));
    expect(led?.distinctPageCount).toBe(2);
    expect(led?.scores.estimated).toBe(true);
    expect(led?.imageUrls.length).toBeGreaterThan(0);
    expect(led?.scores.salesProxy).toBeGreaterThan(0);
    expect(led?.totalAdCount).toBe(2);
    expect(led?.price.midVnd).toBe(79_000);
    expect(led?.price.label).toContain("79.000đ");
    expect(rankings[0]?.scores.heat).toBeGreaterThanOrEqual(rankings[1]?.scores.heat ?? 0);
  });

  it("analyzes a recorded product name for running ads", async () => {
    const service = await seededService();
    const analysis = await service.analyzeProductName("Đèn LED");
    expect(analysis.activeAdCount).toBe(2);
    expect(analysis.totalAdCount).toBe(2);
    expect(analysis.distinctPageCount).toBe(2);
    expect(analysis.intensity).toBe("vua");
    const saved = await service.upsertWatch("Đèn LED", "soi ads", now, null, undefined);
    expect(saved.watch.slug).toContain("den-led");
    const watches = await service.listWatchesWithAnalysis();
    expect(watches).toHaveLength(1);
    expect(watches[0]?.analysis.activeAdCount).toBe(2);
  });

  it("does not treat backfilled long-running pages as new", async () => {
    const service = await seededService();
    const alerts = await service.listAlerts();
    expect(alerts.some((a) => a.pageId === "900021" && a.type === "NEW_PAGE")).toBe(false);
  });

  it("emits new-page alert for a fresh advertiser", async () => {
    const service = await seededService();
    const alerts = await service.listAlerts();
    expect(alerts.some((a) => a.type === "NEW_PAGE" && a.pageId === "900024")).toBe(true);
  });

  it("summarizes industries currently running strong", async () => {
    const service = await seededService();
    const overview = await service.industryOverview(now);
    expect(overview.coverage.totalNiches).toBe(26);
    expect(overview.industries.some((row) => row.nicheSlug === "gadget" && row.hasData)).toBe(true);
    expect(overview.coverage.nichesWithData).toBeGreaterThan(0);
  });

  it("writes weekly report without claiming Facebook sales", async () => {
    const service = await seededService();
    const md = await service.weeklyReport(now);
    expect(md).toContain("Điểm nóng (ước lượng)");
    expect(md).toContain("Không phải");
    expect(md).not.toContain("ROAS đối thủ: ");
  });

  it("builds a scan plan that prefers empty niches and lists running products", async () => {
    const service = await seededService();
    const plan = await service.scanPlan(now);
    expect(plan.totalBranches).toBeGreaterThan(400);
    expect(plan.runningProducts.some((row) => row.query.includes("Đèn LED"))).toBe(true);
    expect(plan.nextBatch.every((row) => !row.covered)).toBe(true);
    const led = plan.branches.find((row) => row.query.toLowerCase().includes("đèn led cảm ứng"));
    expect(led?.covered).toBe(true);
    expect(plan.nameVariants.length + plan.copyKeywords.length).toBeGreaterThan(0);
    expect(plan.moreRunningBatch.length).toBeGreaterThan(0);
    expect(plan.moreRunningBatch.every((row) => row.libraryUrl.includes("ads/library"))).toBe(true);
  });

  it("finds running ads by product name and by keywords in ad copy", async () => {
    const service = await seededService();
    const byName = await service.lookupScan("Đèn LED");
    expect(byName.libraryUrl).toContain("facebook.com/ads/library");
    expect(byName.analysis.activeAdCount).toBe(2);
    expect(byName.variants.length).toBeGreaterThan(0);
    await service.collectManual(
      {
        libraryId: "111000088",
        pageId: "900088",
        pageName: "Copy Shop",
        productTitle: "Glow Night kem mặt",
        startDate: "2026-08-01",
        nicheSlug: "my-pham",
        body: "Kem chống nắng SPF50 cho da dầu — pin sáng 3 tháng không liên quan",
      },
      now,
      null,
      undefined,
    );
    const byCopy = await service.lookupScan("kem chống nắng");
    expect(byCopy.analysis.matches.some((row) => row.matchVia === "copy" || row.matchVia === "both")).toBe(true);
    expect(byCopy.analysis.activeAdCount).toBeGreaterThan(0);
  });

  it("imports an Ad Library sheet idempotently", async () => {
    const service = await seededService();
    const csv = [
      "libraryId,pageId,pageName,productTitle,startDate,nicheSlug,listingPriceVnd",
      "111000099,900099,Sheet Shop,Serum sheet extra,2026-08-01,my-pham,99.000đ",
    ].join("\n");
    const first = await service.collectSheet(csv, now, null, undefined);
    expect(first.imported).toBe(1);
    const second = await service.collectSheet(csv, now, null, undefined);
    expect(second.imported).toBe(1);
    const ads = await service.listAds();
    expect(ads.filter((ad) => ad.libraryId === "111000099")).toHaveLength(1);
  });

  it("imports licensed snapshots into the warehouse without claiming competitor ROAS", async () => {
    const service = await seededService();
    const result = await service.importNormalizedAds(
      [
        {
          libraryId: "licensed-1",
          pageId: "900199",
          pageName: "Licensed Shop",
          body: "Serum niacinamide",
          title: "Serum",
          startDate: "2026-08-01",
          isActive: true,
          platforms: ["facebook"],
          snapshotUrl: null,
          landingUrl: "https://example.com/serum",
          imageUrl: null,
          productHint: "Serum licensed",
          nicheHint: "my-pham",
        },
      ],
      now,
      null,
      undefined,
    );
    expect(result.imported).toBe(1);
    const stats = await service.warehouseStats();
    expect(stats.adCount).toBeGreaterThanOrEqual(4);
    expect(stats.productCount).toBeGreaterThanOrEqual(3);
  });

  it("rejects collect when key is required", async () => {
    const service = new RadarService(new MemoryRadarRepository());
    await expect(
      service.collectSheet(
        "libraryId,pageId,pageName,productTitle,startDate\n1,2,Page,SP,2026-08-01",
        now,
        "wrong",
        "secret",
      ),
    ).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(
      service.collectManual(
        {
          libraryId: "1",
          pageId: "2",
          pageName: "P",
          productTitle: "SP",
          startDate: "2026-08-01",
        },
        now,
        "wrong",
        "secret",
      ),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("syncs own ads separately from market rankings", async () => {
    const service = await seededService();
    const provider = new OwnAdsMarketingApiProvider(
      "token",
      new FixtureMarketingHttp(FIXTURE_GRAPH_INSIGHTS),
    );
    const count = await service.syncOwnInsights(
      provider,
      "act_99",
      "2026-08-20",
      "2026-08-27",
      null,
      undefined,
    );
    expect(count).toBe(2);
    const own = await service.ownInsightsSummary();
    expect(own.totals.estimated).toBe(false);
    expect(own.totals.roas).not.toBeNull();
    const market = await service.listRankings(now);
    expect(market.every((r) => r.scores.estimated)).toBe(true);
  });

  it("builds research rows, dossiers, and trend lanes from saved ads", async () => {
    const service = await seededService();
    const research = await service.listResearch(now, { landing: "any" });
    expect(research.some((row) => row.clusterTitle.includes("Đèn LED"))).toBe(true);
    const led = research.find((row) => row.clusterTitle.includes("Đèn LED"));
    expect(led?.daysRunning).toBeGreaterThan(0);
    const dossier = await service.getProductDossier(led?.clusterSlug ?? "", now);
    expect(dossier?.ads.length).toBe(2);
    expect(dossier?.officialSearchUrl).toContain("ads/library");
    const lanes = await service.listTrendLanes(now);
    expect(lanes.trending.length + lanes.fresh.length).toBeGreaterThan(0);
    const strong = await service.listStrongProducts(now);
    expect(strong.every((row) => row.scores.heat >= 40 || (row.scores.longevity >= 50 && row.activeAdCount >= 2))).toBe(
      true,
    );
    expect(strong.every((row) => row.scores.estimated)).toBe(true);
    const heats = strong.map((row) => row.scores.heat);
    expect(heats).toEqual([...heats].sort((a, b) => b - a));
  });

  it("alerts when a watched page gets a newly saved card", async () => {
    const service = await seededService();
    await service.upsertPageWatch("900024", "TaiNghe Tot", null, now, null, undefined);
    const alerts = await service.listAlerts();
    expect(alerts.some((row) => row.type === "WATCHED_PAGE_NEW_AD" && row.pageId === "900024")).toBe(true);
  });

  it("keeps YouTube views out of HeatScore sales proxy", async () => {
    const service = new RadarService(new MemoryRadarRepository());
    await service.collectManual(
      {
        libraryId: "view-1",
        pageId: "900301",
        pageName: "View Shop",
        productTitle: "Serum chỉ có view",
        startDate: "2026-08-01",
        nicheSlug: "my-pham",
        youtubeViews: 90_000,
        googleAdsSeen: 12,
      },
      now,
      null,
      undefined,
    );
    const rankings = await service.listRankings(now);
    const row = rankings.find((item) => item.clusterTitle.includes("Serum chỉ có view"));
    expect(row?.scores.salesProxy).toBe(0);
    expect(row?.scores.estimated).toBe(true);
  });

  it("builds a multi-channel table from sold peaks and user-counted ads", async () => {
    const service = await seededService();
    await service.collectManual(
      {
        libraryId: "111000030",
        pageId: "900030",
        pageName: "Lazada Shop",
        productTitle: "Đèn LED cảm ứng tủ bếp",
        startDate: "2026-08-01",
        lazadaSold: 400,
        youtubeViews: 50_000,
        googleAdsSeen: 5,
        landingUrl: "https://www.lazada.vn/shop-den/p",
      },
      now,
      null,
      undefined,
    );
    const rows = await service.listChannelAnalysis(now, "sold");
    const led = rows.find((row) => row.clusterTitle.includes("Đèn LED"));
    expect(led?.sold.shopee).toBe(6300);
    expect(led?.sold.lazada).toBe(400);
    expect(led?.soldTotal).toBe(6700);
    expect(led?.youtubeViews).toBe(50_000);
    expect(led?.googleAdsSeen).toBe(5);
    expect(led?.estimated).toBe(true);
    expect(led?.facebookNationalDump).toBe(false);
    expect(led?.landingKinds).toContain("lazada");
    const heat = (await service.listRankings(now)).find((row) => row.clusterTitle.includes("Đèn LED"));
    expect(heat?.scores.salesProxy).toBe(scoreSalesProxy(6300));
    expect(heat?.scores.salesProxy).not.toBe(scoreSalesProxy(50_000));
    const dash = await service.listPlatformDashboard(now, "lazada");
    expect(dash.autoCrawl).toBe(false);
    expect(dash.nationalDump).toBe(false);
    expect(dash.tab.id).toBe("lazada");
    expect(dash.ranked[0]?.sold.lazada).toBe(400);
    expect(dash.coverage.find((row) => row.id === "lazada")?.productsWithData).toBeGreaterThan(0);
    const youtube = await service.listPlatformDashboard(now, "youtube");
    expect(youtube.withDataCount).toBeGreaterThan(0);
    expect(youtube.ranked.some((row) => row.youtubeViews === 50_000)).toBe(true);
    const top = await service.listPlatformBestsellers(now, "lazada", { q: "đèn LED cảm ứng" });
    expect(top.autoCrawl).toBe(false);
    expect(top.nationalDump).toBe(false);
    expect(top.total).toBeGreaterThan(0);
    expect(top.rows.some((row) => row.overlay?.soldLazada === 400)).toBe(true);
    expect(top.rows.every((row) => row.officialUrl.startsWith("https://"))).toBe(true);
  });

  it("mines a Tiki URL from saved copy without inventing sold", async () => {
    const service = await seededService();
    await service.collectManual(
      {
        libraryId: "111000040",
        pageId: "900040",
        pageName: "Tiki Copy",
        productTitle: "Serum niacinamide Tiki",
        startDate: "2026-08-01",
        nicheSlug: "my-pham",
        body: "Mua ngay https://tiki.vn/serum-p99.html",
      },
      now,
      null,
      undefined,
    );
    const tiki = await service.listPlatformDashboard(now, "tiki");
    expect(tiki.withDataCount).toBe(0);
    expect(tiki.landingCount).toBeGreaterThan(0);
    expect(tiki.queue.some((row) => row.reason === "has_landing" && row.savedLandingUrl?.includes("tiki.vn"))).toBe(
      true,
    );
    const heat = (await service.listRankings(now)).find((row) => row.clusterTitle.includes("Serum niacinamide Tiki"));
    expect(heat?.scores.salesProxy).toBe(0);
  });

  it("refreshes YouTube views from saved video ids without touching HeatScore", async () => {
    const youtube = {
      enabled: true,
      fetchViewCounts: async (ids: readonly string[]) => {
        expect(ids).toContain("dQw4w9wgXcQ");
        return [{ videoId: "dQw4w9wgXcQ", viewCount: 4100 }];
      },
    };
    const service = new RadarService(new MemoryRadarRepository(), "fmr_vn", youtube);
    await service.collectManual(
      {
        libraryId: "yt-1",
        pageId: "900401",
        pageName: "YT Shop",
        productTitle: "Review serum YouTube",
        startDate: "2026-08-01",
        nicheSlug: "my-pham",
        landingUrl: "https://www.youtube.com/watch?v=dQw4w9wgXcQ",
      },
      now,
      null,
      undefined,
    );
    const first = await service.refreshYoutubeViewsFromWarehouse(now, null, undefined);
    expect(first.updated).toBe(1);
    expect(first.viewsEnterHeat).toBe(false);
    expect(first.videoCount).toBe(1);
    const again = await service.refreshYoutubeViewsFromWarehouse(now, null, undefined);
    expect(again.updated).toBe(0);
    expect(again.skipped).toBe(1);
    const dash = await service.listPlatformDashboard(now, "youtube");
    expect(dash.withDataCount).toBe(1);
    expect(dash.youtubeVideoCount).toBe(1);
    const heat = (await service.listRankings(now)).find((row) => row.clusterTitle.includes("Review serum"));
    expect(heat?.scores.salesProxy).toBe(0);
    const disabled = new RadarService(new MemoryRadarRepository());
    await expect(disabled.refreshYoutubeViewsFromWarehouse(now, null, undefined)).rejects.toThrow(/YOUTUBE_API_KEY/);
  });

  it("records a channel observation with collect-key authz", async () => {
    const service = await seededService();
    const rankings = await service.listRankings(now);
    const slug = rankings[0]?.clusterSlug ?? "";
    await expect(
      service.recordChannelObservation({ clusterSlug: slug, source: "TIKI", value: 12 }, now, "wrong", "secret"),
    ).rejects.toBeInstanceOf(UnauthorizedError);
    const saved = await service.recordChannelObservation(
      { clusterSlug: slug, source: "tiki", value: 12 },
      now,
      null,
      undefined,
    );
    expect(saved.source).toBe("TIKI");
    const analysis = await service.listChannelAnalysis(now, "tong");
    expect(analysis.some((row) => row.sold.tiki === 12)).toBe(true);
  });

  it("pins boards and tags with collect-key authz", async () => {
    const service = await seededService();
    const board = await service.upsertBoard("Hook giá", null, now, null, undefined);
    const item = await service.addBoardItem(board.slug, "111000021", now, null, undefined);
    expect(item.clusterSlug).toContain("den-led");
    const tags = await service.replaceAdTags("111000021", ["price", "ugc"], null, undefined);
    expect(tags).toEqual(["price", "ugc"]);
    await expect(service.upsertBoard("X", null, now, "wrong", "secret")).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
    await expect(service.upsertPageWatch("900021", "P", null, now, "wrong", "secret")).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
    await expect(service.replaceAdTags("111000021", ["price"], "wrong", "secret")).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
    await expect(service.addBoardItem(board.slug, "111000021", now, "wrong", "secret")).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });
});
