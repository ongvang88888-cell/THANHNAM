import { describe, expect, it } from "vitest";
import { buildChannelAnalysisRow } from "./channel-analysis";
import { listBestsellerCatalog, resetBestsellerCatalogCache } from "./bestseller-catalog";
import type { PriceEstimate } from "./price";
import {
  buildPlatformBestsellerPage,
  catalogMatchesWarehouse,
  listOfficialCatalogHosts,
  officialCatalogUrl,
  officialHostForTab,
  PLATFORM_BESTSELLER_TARGET,
  TOP_PAGE_SIZE,
  unknownMetricSourceDoesNotBecomeShopee,
} from "./platform-bestsellers";
import type { RankingRow } from "./weekly-report";

const PRICE: PriceEstimate = {
  lowVnd: 100_000,
  highVnd: 200_000,
  midVnd: 150_000,
  confidence: "thap",
  sources: ["catalog"],
  label: "≈ 150.000đ",
  note: "test",
};

function ranking(partial: Partial<RankingRow> & Pick<RankingRow, "clusterSlug" | "clusterTitle">): RankingRow {
  return {
    nicheSlug: "my-pham",
    nicheName: "Mỹ phẩm",
    activeAdCount: 2,
    totalAdCount: 2,
    distinctPageCount: 1,
    imageUrls: [],
    price: PRICE,
    scores: {
      intensity: 40,
      longevity: 50,
      velocity: 10,
      salesProxy: 20,
      heat: 35,
      estimated: true,
    },
    ...partial,
  };
}

describe("platform bestsellers", () => {
  it("does not attach warehouse sold counts to a bare one-token catalog title", () => {
    expect(catalogMatchesWarehouse("serum", "serum vitamin c 20%")).toBe(false);
    expect(catalogMatchesWarehouse("serum niacinamide 10% 30ml", "Serum Niacinamide 10% 30ml")).toBe(true);
    expect(catalogMatchesWarehouse("bỉm quần size M 76 miếng", "Bỉm quần size M 76 miếng")).toBe(true);
  });

  it("pages 999 research names and overlays only strong title matches", () => {
    resetBestsellerCatalogCache();
    const warehouse = [
      buildChannelAnalysisRow(
        ranking({ clusterSlug: "serum-n", clusterTitle: "Serum Niacinamide 10% 30ml" }),
        [
          { clusterSlug: "serum-n", source: "SHOPEE", value: 1200, observedMs: 10 },
          { clusterSlug: "serum-n", source: "YOUTUBE_VIEWS", value: 99_000, observedMs: 10 },
        ],
        [],
      ),
      buildChannelAnalysisRow(
        ranking({
          clusterSlug: "bim",
          clusterTitle: "Bỉm quần size M 76 miếng",
          nicheSlug: "me-be",
          nicheName: "Mẹ và bé",
        }),
        [{ clusterSlug: "bim", source: "SHOPEE", value: 15_000, observedMs: 20 }],
        [],
      ),
    ];
    const first = buildPlatformBestsellerPage({ tab: "shopee", warehouse, trang: 1 });
    expect(first.autoCrawl).toBe(false);
    expect(first.nationalDump).toBe(false);
    expect(first.total).toBe(PLATFORM_BESTSELLER_TARGET);
    expect(first.pageSize).toBe(TOP_PAGE_SIZE);
    expect(first.totalPages).toBe(20);
    expect(first.rows).toHaveLength(50);
    expect(first.rows[0]?.rank).toBe(1);
    expect(first.rows[0]?.nicheSlug).toBe("me-be");
    expect(first.rows.every((row) => row.researchOnly)).toBe(true);
    const bim = first.rows.find((row) => /bỉm quần size m 76/i.test(row.title));
    expect(bim?.overlay?.soldShopee).toBe(15_000);
    expect(bim?.overlay?.youtubeViews).toBeNull();
    const last = buildPlatformBestsellerPage({ tab: "shopee", warehouse, trang: 99 });
    expect(last.page).toBe(20);
    expect(last.rows.at(-1)?.rank).toBe(999);
    expect(last.rows).toHaveLength(49);
    const serumPage = buildPlatformBestsellerPage({ tab: "facebook", warehouse, q: "niacinamide 10" });
    expect(serumPage.rows.some((row) => row.overlay?.soldShopee === 1200)).toBe(true);
    expect(serumPage.rows.some((row) => row.overlay?.youtubeViews === 99_000)).toBe(true);
    expect(
      serumPage.rows.filter((row) => row.title.toLowerCase() === "serum").every((row) => row.overlay === null),
    ).toBe(true);
  });

  it("builds official research URLs and never treats views as a sold source", () => {
    expect(officialHostForTab("shopee")).toBe("shopee.vn");
    expect(officialHostForTab("lazada")).toBe("lazada.vn");
    expect(officialHostForTab("tiki")).toBe("tiki.vn");
    expect(officialHostForTab("sendo")).toBe("sendo.vn");
    expect(officialHostForTab("google")).toBe("adstransparency.google.com");
    expect(officialHostForTab("youtube")).toBe("youtube.com");
    expect(officialHostForTab("facebook")).toContain("facebook.com");
    expect(officialCatalogUrl("shopee", "bỉm quần")).toContain("shopee.vn");
    expect(officialCatalogUrl("google", "serum")).toContain("region=VN");
    expect(listOfficialCatalogHosts().every((host) => !host.includes("apify"))).toBe(true);
    expect(unknownMetricSourceDoesNotBecomeShopee()).toBe(true);
    const yt = buildPlatformBestsellerPage({
      tab: "youtube",
      warehouse: [
        buildChannelAnalysisRow(
          ranking({ clusterSlug: "op", clusterTitle: "Ốp lưng iPhone 16 Pro", nicheSlug: "dien-tu", nicheName: "Điện tử" }),
          [{ clusterSlug: "op", source: "YOUTUBE_VIEWS", value: 4100, observedMs: 5 }],
          [],
        ),
      ],
    });
    expect(yt.rows[0]?.nicheSlug).toBe("dien-tu");
    const overlay = yt.rows.find((row) => /iphone 16 pro/i.test(row.title))?.overlay;
    expect(overlay?.youtubeViews).toBe(4100);
    expect(overlay?.soldTotal).toBe(0);
  });

  it("keeps the same 999 titles on every platform, only the order changes", () => {
    resetBestsellerCatalogCache();
    const titles = new Set(listBestsellerCatalog().map((row) => row.title));
    const shopee = buildPlatformBestsellerPage({ tab: "shopee", warehouse: [] });
    const youtube = buildPlatformBestsellerPage({ tab: "youtube", warehouse: [] });
    expect(new Set(shopee.rows.map((row) => row.title)).size).toBeLessThanOrEqual(50);
    expect(titles.size).toBe(999);
    expect(shopee.total).toBe(youtube.total);
    expect(shopee.rows[0]?.title).not.toBe(youtube.rows[0]?.title);
  });
});
