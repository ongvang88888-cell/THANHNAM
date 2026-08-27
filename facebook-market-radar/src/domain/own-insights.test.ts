import { describe, expect, it } from "vitest";
import { mapGraphInsight, redactToken, summarizeOwnInsights } from "./own-insights";

describe("own insights", () => {
  it("maps Graph spend (major) to minor units and purchase actions", () => {
    const row = mapGraphInsight("act_1", {
      campaign_id: "c1",
      campaign_name: "Prospecting",
      date_start: "2026-08-20",
      spend: "12.50",
      impressions: "1000",
      actions: [{ action_type: "purchase", value: "3" }],
      action_values: [{ action_type: "purchase", value: "45.00" }],
    });
    expect(row).toMatchObject({
      adAccountId: "act_1",
      spendMinor: 1250,
      purchases: 3,
      purchaseValueMinor: 4500,
    });
  });

  it("computes ROAS only when purchase value exists", () => {
    const withValue = summarizeOwnInsights([
      {
        adAccountId: "a",
        campaignId: "c",
        campaignName: "n",
        date: "2026-08-20",
        spendMinor: 1000,
        impressions: 10,
        purchases: 1,
        purchaseValueMinor: 2500,
      },
    ]);
    expect(withValue.roas).toBe(2.5);
    expect(withValue.estimated).toBe(false);

    const noValue = summarizeOwnInsights([
      {
        adAccountId: "a",
        campaignId: "c",
        campaignName: "n",
        date: "2026-08-20",
        spendMinor: 1000,
        impressions: 10,
        purchases: 1,
        purchaseValueMinor: null,
      },
    ]);
    expect(noValue.roas).toBeNull();
  });

  it("redacts bearer tokens from error text", () => {
    expect(redactToken("401 Bearer abc.def-ghi")).toBe("401 Bearer [redacted]");
  });
});
