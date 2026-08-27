import { describe, expect, it } from "vitest";
import { MemoryRadarRepository } from "../adapters/memory-repository";
import {
  FixtureMarketingHttp,
  FIXTURE_GRAPH_INSIGHTS,
  OwnAdsMarketingApiProvider,
} from "../adapters/marketing-api-provider";
import { UnauthorizedError } from "../domain/authz";
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
    expect(rankings[0]?.scores.heat).toBeGreaterThanOrEqual(rankings[1]?.scores.heat ?? 0);
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

  it("rejects collect when key is required", async () => {
    const service = new RadarService(new MemoryRadarRepository());
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
});
