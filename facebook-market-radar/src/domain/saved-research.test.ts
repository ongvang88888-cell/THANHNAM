import { describe, expect, it } from "vitest";
import {
  buildProductDossier,
  enrichResearchRow,
  filterResearchRows,
  hookDigest,
  parseSavedFilter,
  sanitizeUserTags,
  splitTrendLanes,
  watchedPageNewAdAlerts,
  type SavedAdLite,
} from "./saved-research";
import type { RankingRow } from "./weekly-report";

const now = Date.parse("2026-08-27T00:00:00.000Z");

function row(partial: Partial<RankingRow> & Pick<RankingRow, "clusterSlug" | "clusterTitle">): RankingRow {
  return {
    nicheSlug: "gadget",
    nicheName: "Thiết bị nhà thông minh",
    activeAdCount: 2,
    totalAdCount: 2,
    distinctPageCount: 2,
    imageUrls: [],
    price: {
      lowVnd: 79_000,
      highVnd: 79_000,
      midVnd: 79_000,
      label: "≈ 79.000đ",
      confidence: "cao",
      note: "bạn nhập",
      sources: ["user"],
    },
    scores: { intensity: 40, longevity: 60, velocity: 10, salesProxy: 50, heat: 45, estimated: true },
    ...partial,
  };
}

function ad(partial: Partial<SavedAdLite> & Pick<SavedAdLite, "libraryId" | "clusterSlug">): SavedAdLite {
  return {
    pageId: "900021",
    startDate: "2026-05-20",
    isActive: true,
    body: "Đèn LED cảm ứng tủ bếp giá sốc 79.000đ",
    title: "Đèn LED cảm ứng",
    landingUrl: "https://shopee.vn/shop-den/led",
    imageUrl: "/api/anh-san-pham?slug=den",
    listingPriceVnd: 79_000,
    firstSeenMs: now - 40 * 86_400_000,
    lastSeenMs: now,
    ...partial,
  };
}

describe("saved-research", () => {
  it("marks strong products trending and new ones fresh", () => {
    const led = enrichResearchRow(
      row({ clusterSlug: "den-led", clusterTitle: "Đèn LED cảm ứng tủ bếp" }),
      [
        ad({ libraryId: "1", clusterSlug: "den-led", pageId: "1" }),
        ad({ libraryId: "2", clusterSlug: "den-led", pageId: "2", startDate: "2026-07-01" }),
      ],
      now,
    );
    expect(led.lane).toBe("trending");
    expect(led.hasLanding).toBe(true);
    expect(led.landingKinds).toContain("shopee");
    expect(led.angles).toContain("price");
    expect(led.daysRunning).toBeGreaterThan(30);

    const fresh = enrichResearchRow(
      row({
        clusterSlug: "tai-nghe",
        clusterTitle: "Tai nghe mới",
        activeAdCount: 1,
        distinctPageCount: 1,
        scores: { intensity: 10, longevity: 10, velocity: 20, salesProxy: 0, heat: 12, estimated: true },
      }),
      [
        ad({
          libraryId: "3",
          clusterSlug: "tai-nghe",
          firstSeenMs: now - 2 * 86_400_000,
          startDate: "2026-08-24",
          landingUrl: null,
          body: "Tai nghe mới",
        }),
      ],
      now,
    );
    expect(fresh.lane).toBe("fresh");
    expect(fresh.hasLanding).toBe(false);
  });

  it("filters by landing, angle, days and lane", () => {
    const rows = [
      enrichResearchRow(
        row({ clusterSlug: "den-led", clusterTitle: "Đèn LED cảm ứng tủ bếp" }),
        [ad({ libraryId: "1", clusterSlug: "den-led" })],
        now,
      ),
    ];
    expect(filterResearchRows(rows, { landing: "yes", angle: "price", minDays: 10 }).length).toBe(1);
    expect(filterResearchRows(rows, { landingKind: "tiktok" }).length).toBe(0);
    expect(filterResearchRows(rows, { shop: "shop-den" }).length).toBe(1);
    expect(filterResearchRows(rows, parseSavedFilter({ lane: "fresh" })).length).toBe(0);
    expect(splitTrendLanes(rows).trending.length).toBe(1);
  });

  it("builds a dossier, hook digest, and watched-page alerts", () => {
    const ads = [
      ad({ libraryId: "1", clusterSlug: "den-led", pageId: "900021" }),
      ad({
        libraryId: "9",
        clusterSlug: "den-ban",
        landingUrl: "https://shopee.vn/shop-den/ban",
        firstSeenMs: now - 86_400_000,
      }),
    ];
    const research = enrichResearchRow(
      row({ clusterSlug: "den-led", clusterTitle: "Đèn LED cảm ứng tủ bếp" }),
      ads,
      now,
    );
    const dossier = buildProductDossier(research, ads, now);
    expect(dossier.pages[0]?.pageId).toBe("900021");
    expect(dossier.relatedSlugs).toContain("den-ban");
    expect(dossier.officialSearchUrl).toContain("facebook.com/ads/library");

    const hooks = hookDigest(ads, new Map([["den-led", "gadget"], ["den-ban", "gadget"]]), "gadget");
    expect(hooks.some((row) => row.phrase.includes("đèn") || row.count >= 1)).toBe(true);

    const alerts = watchedPageNewAdAlerts(
      [{ pageId: "900021", pageName: "NhaGo" }],
      [ad({ libraryId: "88", clusterSlug: "den-led", pageId: "900021", firstSeenMs: now - 3_600_000 })],
      [{ pageId: "900021", pageName: "NhaGo" }],
      now,
    );
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.title).toContain("NhaGo");
    expect(sanitizeUserTags(["Price", "ugc", "x", "ok-tag"])).toEqual(["price", "ugc", "ok-tag"]);
  });
});
