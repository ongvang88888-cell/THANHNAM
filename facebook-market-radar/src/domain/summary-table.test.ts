import { describe, expect, it } from "vitest";
import { officialResearchLinks } from "./sales-channels";
import {
  SUMMARY_INTERVAL_MS,
  SUMMARY_OPTIONAL_CELL_COUNT,
  buildSummarySnapshot,
  countOptionalMetricCells,
  filterSummaryRows,
  isSummaryDue,
  mergeOptionalMetric,
  nextSummaryDueAt,
  parseSummarySnapshot,
} from "./summary-table";
import { buildChannelAnalysisRow } from "./channel-analysis";
import type { PriceEstimate } from "./price";
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

function ranking(slug: string, title: string): RankingRow {
  return {
    clusterSlug: slug,
    clusterTitle: title,
    nicheSlug: "gadget",
    nicheName: "Gadget",
    activeAdCount: 2,
    totalAdCount: 2,
    distinctPageCount: 1,
    imageUrls: [],
    price: PRICE,
    scores: {
      intensity: 40,
      longevity: 20,
      velocity: 10,
      salesProxy: 20,
      heat: 30,
      estimated: true,
    },
  };
}

describe("summary table cycle", () => {
  it("schedules the next write 6 hours later", () => {
    const captured = Date.parse("2026-08-28T00:00:00.000Z");
    expect(SUMMARY_INTERVAL_MS).toBe(6 * 60 * 60 * 1000);
    expect(nextSummaryDueAt(captured)).toBe(captured + SUMMARY_INTERVAL_MS);
    expect(isSummaryDue(null, captured)).toBe(true);
    expect(isSummaryDue(captured + SUMMARY_INTERVAL_MS, captured + SUMMARY_INTERVAL_MS - 1)).toBe(false);
    expect(isSummaryDue(captured + SUMMARY_INTERVAL_MS, captured + SUMMARY_INTERVAL_MS)).toBe(true);
  });

  it("counts only entered optional cells and never invents sold", () => {
    const row = buildChannelAnalysisRow(ranking("den", "Đèn LED"), [
      { clusterSlug: "den", source: "SHOPEE", value: 34, observedMs: 1 },
    ], []);
    expect(row.sold.shopee).toBe(34);
    expect(row.sold.tiki).toBeNull();
    expect(row.youtubeViews).toBeNull();
    const cells = countOptionalMetricCells([row]);
    expect(cells.filledCells).toBe(1);
    expect(cells.emptyCells).toBe(SUMMARY_OPTIONAL_CELL_COUNT - 1);
    expect(mergeOptionalMetric(null, null)).toBeNull();
    expect(mergeOptionalMetric(5, 9)).toBe(5);
    expect(mergeOptionalMetric(null, 9)).toBe(9);
    expect(mergeOptionalMetric(0, 9)).toBe(0);
  });

  it("parses a snapshot without inventing marketplace sold", () => {
    const live = buildChannelAnalysisRow(
      ranking("serum", "Serum vitamin C"),
      [{ clusterSlug: "serum", source: "SHOPEE", value: 12, observedMs: 1 }],
      [],
    );
    const snapshot = buildSummarySnapshot({
      capturedAtMs: Date.parse("2026-08-28T06:00:00.000Z"),
      rows: [live],
      apiRan: false,
    });
    expect(snapshot.estimated).toBe(true);
    expect(snapshot.facebookNationalDump).toBe(false);
    expect(snapshot.marketSoldFromApi).toBe(false);
    expect(snapshot.scrapeMarketplaceHtml).toBe(false);
    expect(snapshot.rows[0]?.sold.tiki).toBeNull();
    expect(snapshot.rows[0]?.sold.shopee).toBe(12);
    const parsed = parseSummarySnapshot(JSON.stringify(snapshot));
    expect(parsed?.rows[0]?.sold.shopee).toBe(12);
    expect(parsed?.rows[0]?.sold.lazada).toBeNull();
    expect(parsed?.facebookNationalDump).toBe(false);
    expect(
      parseSummarySnapshot({
        capturedAt: "2026-08-28T06:00:00.000Z",
        nextDueAt: "2026-08-28T12:00:00.000Z",
        rows: [
          {
            clusterSlug: "x",
            clusterTitle: "X",
            sold: { shopee: "nhiều", tiki: -1 },
            links: officialResearchLinks("X"),
          },
        ],
      })?.rows[0]?.sold.shopee,
    ).toBeNull();
    expect(filterSummaryRows(snapshot.rows, "serum")).toHaveLength(1);
    expect(filterSummaryRows(snapshot.rows, "tiki")).toHaveLength(0);
  });
});
