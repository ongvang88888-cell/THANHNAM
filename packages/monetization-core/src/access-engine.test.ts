import { describe, expect, it } from "vitest";
import { evaluateAccess } from "./access-engine";
import { buildEntitlementGrants } from "./fulfillment";
import { evaluateRewardEligibility } from "./reward-ports";

describe("evaluateAccess", () => {
  const now = new Date("2026-08-25T12:00:00Z");

  it("allows FREE policy", () => {
    const d = evaluateAccess({
      now,
      isAuthenticated: false,
      resourceType: "lesson",
      resourceId: "l1",
      policies: [{ policyType: "FREE", priority: 1, params: {} }],
      entitlements: [],
    });
    expect(d.code).toBe("CAN_ACCESS");
  });

  it("requires purchase when no entitlement", () => {
    const d = evaluateAccess({
      now,
      isAuthenticated: true,
      resourceType: "lesson",
      resourceId: "l2",
      policies: [
        {
          policyType: "PURCHASE_REQUIRED",
          priority: 1,
          params: { productId: "p1" },
        },
      ],
      entitlements: [],
    });
    expect(d.code).toBe("NEEDS_PURCHASE");
    if (d.code === "NEEDS_PURCHASE") expect(d.productIds).toContain("p1");
  });

  it("allows when product entitlement exists", () => {
    const d = evaluateAccess({
      now,
      isAuthenticated: true,
      resourceType: "lesson",
      resourceId: "l2",
      policies: [
        {
          policyType: "PURCHASE_REQUIRED",
          priority: 1,
          params: { productId: "p1" },
        },
      ],
      entitlements: [
        {
          resourceType: "product",
          resourceId: "p1",
          source: "PURCHASE",
          status: "ACTIVE",
        },
      ],
    });
    expect(d.code).toBe("CAN_ACCESS");
  });

  it("allows temporary reward entitlement on lesson", () => {
    const d = evaluateAccess({
      now,
      isAuthenticated: true,
      resourceType: "lesson",
      resourceId: "l2",
      policies: [
        { policyType: "PURCHASE_REQUIRED", priority: 1, params: { productId: "p1" } },
        { policyType: "REWARDED_AD", priority: 2, params: { policyCode: "lesson_unlock_24h" } },
      ],
      entitlements: [
        {
          resourceType: "lesson",
          resourceId: "l2",
          source: "REWARD",
          status: "ACTIVE",
          expiresAt: new Date("2026-08-26T12:00:00Z"),
        },
      ],
    });
    expect(d.code).toBe("CAN_ACCESS");
  });

  it("never trusts missing policies as allow", () => {
    const d = evaluateAccess({
      now,
      isAuthenticated: true,
      resourceType: "lesson",
      resourceId: "x",
      policies: [],
      entitlements: [],
    });
    expect(d.code).toBe("CANNOT_ACCESS");
  });
});

describe("buildEntitlementGrants", () => {
  it("expands bundle children", () => {
    const grants = buildEntitlementGrants([
      {
        orderItemId: "oi1",
        productId: "bundle1",
        productType: "MIXED_BUNDLE",
        childProductIds: ["c1", "d1"],
      },
    ]);
    expect(grants).toHaveLength(3);
    expect(grants.some((g) => g.resourceType === "bundle")).toBe(true);
    expect(grants.filter((g) => g.source === "BUNDLE")).toHaveLength(3);
  });
});

describe("evaluateRewardEligibility", () => {
  it("denies over daily limit", () => {
    const r = evaluateRewardEligibility({
      userId: "u",
      resourceType: "lesson",
      resourceId: "l",
      dailyCount: 5,
      dailyLimit: 5,
      cooldownMinutes: 0,
      now: new Date(),
      rewardedEnabled: true,
    });
    expect(r.eligible).toBe(false);
    expect(r.reason).toBe("daily_limit");
  });
});
