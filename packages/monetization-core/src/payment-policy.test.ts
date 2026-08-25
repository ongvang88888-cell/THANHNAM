import { describe, expect, it } from "vitest";
import {
  allowedCheckoutProviders,
  assertProviderAllowedForPlatform,
  assertSkuMatchesExpected,
  defaultStoreProvider,
  PaymentPolicyConfig,
  resolveStoreSku,
} from "./payment-ports";

describe("payment policy", () => {
  it("requires google_play on android", () => {
    expect(allowedCheckoutProviders("android")).toContain("google_play");
    expect(allowedCheckoutProviders("android")).not.toContain("stripe");
    expect(allowedCheckoutProviders("android")).not.toContain("apple_iap");
  });

  it("requires apple_iap on ios", () => {
    expect(allowedCheckoutProviders("ios")).toContain("apple_iap");
    expect(allowedCheckoutProviders("ios")).not.toContain("stripe");
    expect(allowedCheckoutProviders("ios")).not.toContain("google_play");
  });

  it("allows stripe/vnpay on web only (no store digests)", () => {
    expect(allowedCheckoutProviders("web")).toEqual(
      expect.arrayContaining(["mock", "stripe", "vnpay"]),
    );
    expect(allowedCheckoutProviders("web")).not.toContain("google_play");
    expect(allowedCheckoutProviders("web")).not.toContain("apple_iap");
  });

  it("throws when stripe used on android", () => {
    expect(() => assertProviderAllowedForPlatform("stripe", "android")).toThrow(/not allowed/);
  });

  it("throws when google_play used on ios", () => {
    expect(() => assertProviderAllowedForPlatform("google_play", "ios")).toThrow(/not allowed/);
  });

  it("defaults store provider per platform", () => {
    expect(defaultStoreProvider("android")).toBe("google_play");
    expect(defaultStoreProvider("ios")).toBe("apple_iap");
    expect(defaultStoreProvider("web")).toBeNull();
  });

  it("exposes PaymentPolicyConfig as single source of truth", () => {
    expect(PaymentPolicyConfig.iosProviders).toContain("apple_iap");
    expect(PaymentPolicyConfig.androidProviders).toContain("google_play");
  });
});

describe("resolveStoreSku", () => {
  it("prefers playSku / appleSku over slug", () => {
    expect(resolveStoreSku("google_play", { playSku: "course_a" }, "slug")).toBe("course_a");
    expect(resolveStoreSku("apple_iap", { appleSku: "course_a_ios" }, "slug")).toBe("course_a_ios");
    expect(resolveStoreSku("google_play", {}, "slug")).toBe("slug");
  });

  it("asserts SKU match", () => {
    expect(() => assertSkuMatchesExpected("a", "b")).toThrow(/SKU mismatch/);
    expect(() => assertSkuMatchesExpected("a", "a")).not.toThrow();
  });
});
