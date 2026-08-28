import { describe, expect, it } from "vitest";
import { buildLibraryCards, parseLibrarySort, sortLibraryCards } from "./ad-library-cards";
import { enrichResearchRow, type SavedAdLite } from "./saved-research";
import type { RankingRow } from "./weekly-report";

const now = Date.parse("2026-08-27T00:00:00.000Z");

function row(): RankingRow {
  return {
    clusterSlug: "den-led",
    clusterTitle: "Đèn LED cảm ứng tủ bếp",
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
  };
}

function ad(partial: Partial<SavedAdLite> = {}): SavedAdLite {
  return {
    libraryId: "111",
    pageId: "900021",
    clusterSlug: "den-led",
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

describe("ad-library-cards", () => {
  it("builds cards only for research rows still in the filtered set", () => {
    const research = [enrichResearchRow(row(), [ad()], now)];
    const cards = buildLibraryCards(
      [ad(), ad({ libraryId: "222", clusterSlug: "other" })],
      [{ slug: "den-led", title: "Đèn LED cảm ứng tủ bếp", nicheSlug: "gadget", imageUrl: null }],
      [{ pageId: "900021", pageName: "NhaGo" }],
      research,
      now,
    );
    expect(cards).toHaveLength(1);
    expect(cards[0]?.pageName).toBe("NhaGo");
    expect(cards[0]?.libraryAdUrl).toContain("id=111");
    expect(cards[0]?.landingKind).toBe("shopee");
    expect(cards[0]?.heat).toBe(45);
  });

  it("sorts by running days or first seen without inventing engagement", () => {
    expect(parseLibrarySort("likes")).toBe("heat");
    const older = {
      libraryId: "1",
      pageId: "1",
      pageName: "A",
      clusterSlug: "a",
      clusterTitle: "A",
      nicheName: "x",
      imageUrl: null,
      hook: "",
      copy: "",
      landingKind: "none" as const,
      landingUrl: null,
      startDate: "2026-01-01",
      firstSeenMs: 10,
      lastSeenMs: 20,
      isActive: true,
      daysRunning: 80,
      heat: 10,
      intensity: 1,
      longevity: 1,
      velocity: 1,
      lane: "other" as const,
      priceLabel: "—",
      libraryAdUrl: "https://www.facebook.com/ads/library/?id=1",
      libraryPageUrl: "https://www.facebook.com/ads/library/?view_all_page_id=1",
      angles: [],
    };
    const newer = { ...older, libraryId: "2", daysRunning: 2, heat: 90, firstSeenMs: 50, lastSeenMs: 5 };
    expect(sortLibraryCards([older, newer], "heat")[0]?.libraryId).toBe("2");
    expect(sortLibraryCards([older, newer], "days")[0]?.libraryId).toBe("1");
    expect(sortLibraryCards([older, newer], "latest")[0]?.libraryId).toBe("2");
    expect(sortLibraryCards([older, newer], "lastSeen")[0]?.libraryId).toBe("1");
  });
});
