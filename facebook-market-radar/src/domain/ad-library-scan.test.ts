import { describe, expect, it } from "vitest";
import { buildAdLibrarySearchUrl } from "./ad-library-url";
import {
  buildScanPlan,
  catalogScanQueryCount,
  isUsefulScanQuery,
  runningProductBranches,
  scanQueriesForNiche,
  textsMatchScanQuery,
} from "./ad-library-scan";
import { LOCKED_NICHES } from "./niches";
import type { PriceEstimate } from "./price";
import type { RankingRow } from "./weekly-report";

const TEST_PRICE: PriceEstimate = {
  lowVnd: 70_000,
  highVnd: 90_000,
  midVnd: 79_000,
  confidence: "cao",
  sources: ["user"],
  label: "79.000đ",
  note: "test",
};

function ranking(partial: Partial<RankingRow> & Pick<RankingRow, "clusterSlug" | "nicheSlug">): RankingRow {
  return {
    clusterTitle: partial.clusterTitle ?? "Đèn LED cảm ứng tủ bếp",
    nicheName: partial.nicheName ?? "Thiết bị nhà thông minh",
    activeAdCount: partial.activeAdCount ?? 2,
    totalAdCount: partial.totalAdCount ?? 2,
    distinctPageCount: partial.distinctPageCount ?? 2,
    imageUrls: [],
    price: TEST_PRICE,
    scores: {
      intensity: 40,
      longevity: 50,
      velocity: 20,
      salesProxy: 10,
      heat: 55,
      estimated: true,
    },
    ...partial,
  };
}

describe("ad library scan plan", () => {
  it("keeps multi-word product queries and drops generic tokens", () => {
    expect(isUsefulScanQuery("serum niacinamide")).toBe(true);
    expect(isUsefulScanQuery("collagen")).toBe(false);
    expect(isUsefulScanQuery("abc")).toBe(false);
    expect(isUsefulScanQuery("retinol")).toBe(false);
    expect(isUsefulScanQuery("máy đo huyết áp")).toBe(true);
  });

  it("matches saved titles against a branch query", () => {
    expect(textsMatchScanQuery("đèn led cảm ứng", ["Đèn LED cảm ứng tủ bếp"])).toBe(true);
    expect(textsMatchScanQuery("nồi chiên không dầu", ["Kệ gia vị nhà bếp"])).toBe(false);
    expect(textsMatchScanQuery("serum niacinamide", ["Serum Niacinamide 10% 30ml"])).toBe(true);
  });

  it("merges catalog keywords with extra branches and builds official VN search URLs", () => {
    const gadget = LOCKED_NICHES.find((n) => n.slug === "gadget");
    expect(gadget).toBeTruthy();
    const queries = scanQueriesForNiche(gadget!);
    expect(queries.some((q) => q.toLowerCase().includes("đèn led"))).toBe(true);
    expect(queries.some((q) => q.toLowerCase().includes("camera wifi"))).toBe(true);
    expect(queries.every((q) => isUsefulScanQuery(q))).toBe(true);
    const url = buildAdLibrarySearchUrl("đèn led cảm ứng");
    expect(url).toContain("facebook.com/ads/library");
    expect(url).toContain("country=VN");
    expect(url).toContain("active_status=active");
    expect(url).toMatch(/q=/);
  });

  it("covers many product-name branches across 26 niches", () => {
    expect(catalogScanQueryCount()).toBeGreaterThan(400);
  });

  it("prioritizes empty niches and uncovered branches", () => {
    const plan = buildScanPlan(
      [ranking({ clusterSlug: "den-led", nicheSlug: "gadget" })],
      ["Đèn LED cảm ứng tủ bếp"],
    );
    expect(plan.totalBranches).toBeGreaterThan(400);
    expect(plan.uncoveredCount).toBeGreaterThan(300);
    expect(plan.runningProducts).toHaveLength(1);
    expect(plan.runningProducts[0]?.query).toContain("Đèn LED");
    expect(plan.nextBatch.length).toBeGreaterThan(0);
    expect(plan.nextBatch.every((row) => !row.covered)).toBe(true);
    expect(plan.nextBatch[0]?.nicheHasData).toBe(false);
    const led = plan.branches.find((row) => row.query.toLowerCase().includes("đèn led cảm ứng"));
    expect(led?.covered).toBe(true);
    expect(led?.nicheSlug).toBe("gadget");
  });

  it("lists running products as reopen searches", () => {
    const rows = runningProductBranches([
      ranking({ clusterSlug: "den-led", nicheSlug: "gadget", scores: {
        intensity: 40,
        longevity: 50,
        velocity: 20,
        salesProxy: 10,
        heat: 80,
        estimated: true,
      } }),
      ranking({
        clusterSlug: "inactive",
        nicheSlug: "gadget",
        clusterTitle: "Sản phẩm tắt",
        activeAdCount: 0,
      }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.kind).toBe("running");
    expect(rows[0]?.libraryUrl).toContain("q=");
  });
});
