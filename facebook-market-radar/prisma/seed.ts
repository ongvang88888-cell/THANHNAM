import { PrismaClient } from "../src/generated/prisma";
import { resolveDatabaseUrl } from "../src/server/prisma";
import { PrismaRadarRepository } from "../src/adapters/prisma-repository";
import {
  FixtureMarketingHttp,
  FIXTURE_GRAPH_INSIGHTS,
  OwnAdsMarketingApiProvider,
} from "../src/adapters/marketing-api-provider";
import { RadarService, DEFAULT_APP_ID } from "../src/application/radar-service";
import { LOCKED_NICHES } from "../src/domain/niches";
import { DEMO_NOW_MS, V0_SAMPLE_ADS } from "../src/fixtures/v0-sample";

async function main(): Promise<void> {
  resolveDatabaseUrl();
  const prisma = new PrismaClient();
  const appId = process.env.FMR_APP_ID ?? DEFAULT_APP_ID;

  await prisma.alert.deleteMany({ where: { appId } });
  await prisma.marketSnapshot.deleteMany({ where: { appId } });
  await prisma.salesProxyObservation.deleteMany({ where: { appId } });
  await prisma.adProductLink.deleteMany();
  await prisma.productWatch.deleteMany({ where: { appId } });
  await prisma.ad.deleteMany({ where: { appId } });
  await prisma.adCreative.deleteMany({ where: { appId } });
  await prisma.productCluster.deleteMany({ where: { appId } });
  await prisma.advertiserPage.deleteMany({ where: { appId } });
  await prisma.ownInsightsDaily.deleteMany({ where: { appId } });
  await prisma.niche.deleteMany({ where: { appId } });

  for (const niche of LOCKED_NICHES) {
    await prisma.niche.create({
      data: { appId, slug: niche.slug, nameVi: niche.nameVi, nameEn: niche.nameEn },
    });
  }

  const service = new RadarService(new PrismaRadarRepository(prisma), appId);
  for (const ad of V0_SAMPLE_ADS) {
    await service.collectManual(ad, DEMO_NOW_MS, null, undefined);
  }

  const own = new OwnAdsMarketingApiProvider("fixture", new FixtureMarketingHttp(FIXTURE_GRAPH_INSIGHTS));
  await service.syncOwnInsights(own, "act_demo", "2026-08-20", "2026-08-27", null, undefined);

  for (const name of ["Serum Niacinamide", "Bỉm quần", "Đèn LED"]) {
    await service.upsertWatch(name, "mẫu theo dõi", DEMO_NOW_MS, null, undefined);
  }

  const rankings = await service.listRankings(DEMO_NOW_MS);
  const alerts = await service.listAlerts();
  const watches = await service.listWatchesWithAnalysis();
  const overview = await service.industryOverview(DEMO_NOW_MS);
  console.log(
    `Seeded ${V0_SAMPLE_ADS.length} ads, ${rankings.length} products, ${watches.length} watches, ${alerts.length} alerts, coverage ${overview.coverage.coveragePercent}% (${overview.coverage.hotIndustryCount} hot industries)`,
  );
  await prisma.$disconnect();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "seed failed");
  process.exit(1);
});
