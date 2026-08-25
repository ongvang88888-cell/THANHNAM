import { describe, expect, it } from "vitest";
import { allowedCheckoutProviders, assertProviderAllowedForPlatform } from "./payment-ports";

describe("payment policy", () => {
  it("requires google_play on android", () => {
    expect(allowedCheckoutProviders("android")).toContain("google_play");
    expect(allowedCheckoutProviders("android")).not.toContain("stripe");
  });

  it("allows stripe/vnpay on web", () => {
    expect(allowedCheckoutProviders("web")).toEqual(
      expect.arrayContaining(["mock", "stripe", "vnpay"]),
    );
  });

  it("throws when stripe used on android", () => {
    expect(() => assertProviderAllowedForPlatform("stripe", "android")).toThrow(/not allowed/);
  });
});
