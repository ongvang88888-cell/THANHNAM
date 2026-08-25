import { describe, expect, it, afterEach } from "vitest";
import {
  allowMockPayments,
  computeInvoiceAmounts,
  defaultPaymentProvider,
  isProduction,
  jwtAccessSecret,
} from "./runtime";

const original = { ...process.env };

afterEach(() => {
  process.env.NODE_ENV = original.NODE_ENV;
  process.env.ALLOW_MOCK_PAYMENTS = original.ALLOW_MOCK_PAYMENTS;
  process.env.DEFAULT_PAYMENT_PROVIDER = original.DEFAULT_PAYMENT_PROVIDER;
  process.env.JWT_ACCESS_SECRET = original.JWT_ACCESS_SECRET;
});

describe("runtime gates", () => {
  it("treats production mock as disabled unless explicitly allowed", () => {
    process.env.NODE_ENV = "production";
    delete process.env.ALLOW_MOCK_PAYMENTS;
    expect(isProduction()).toBe(true);
    expect(allowMockPayments()).toBe(false);
    delete process.env.DEFAULT_PAYMENT_PROVIDER;
    expect(defaultPaymentProvider()).toBe("vnpay");
  });

  it("rejects weak JWT secrets in production", () => {
    process.env.NODE_ENV = "production";
    process.env.JWT_ACCESS_SECRET = "dev-access-secret-change-me-32chars!!";
    expect(() => jwtAccessSecret()).toThrow(/JWT_ACCESS_SECRET/);
  });

  it("computes VAT inclusive extras", () => {
    const amt = computeInvoiceAmounts(100_000, 10_000, 1000);
    expect(amt.vatMinor).toBe(10_000);
    expect(amt.totalMinor).toBe(110_000);
  });
});
