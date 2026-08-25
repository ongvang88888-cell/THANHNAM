import { describe, expect, it } from "vitest";
import {
  assertCouponRedeemable,
  computeAffiliateCommissionMinor,
  computeCouponDiscountMinor,
} from "./promotions";

describe("computeCouponDiscountMinor", () => {
  it("applies percent off", () => {
    expect(
      computeCouponDiscountMinor({ enabled: true, percentOff: 10 }, 100_000),
    ).toBe(10_000);
  });

  it("applies amount off capped at total", () => {
    expect(
      computeCouponDiscountMinor({ enabled: true, amountOffMinor: 50_000 }, 40_000),
    ).toBe(40_000);
  });

  it("returns 0 when disabled", () => {
    expect(computeCouponDiscountMinor({ enabled: false, percentOff: 50 }, 100)).toBe(0);
  });
});

describe("assertCouponRedeemable", () => {
  it("rejects expired", () => {
    expect(() =>
      assertCouponRedeemable(
        { enabled: true, endsAt: new Date("2020-01-01"), currency: "VND" },
        "VND",
        new Date("2026-01-01"),
      ),
    ).toThrow(/expired/i);
  });

  it("rejects max redemptions", () => {
    expect(() =>
      assertCouponRedeemable(
        { enabled: true, currency: "VND", maxRedemptions: 1, redemptionCount: 1 },
        "VND",
      ),
    ).toThrow(/max redemptions/i);
  });
});

describe("computeAffiliateCommissionMinor", () => {
  it("computes 10% from 1000 bps", () => {
    expect(computeAffiliateCommissionMinor(499_000, 1000)).toBe(49_900);
  });
});
