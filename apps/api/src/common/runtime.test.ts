import { describe, expect, it, afterEach } from "vitest";
import {
  allowMockPayments,
  assertProductionSecrets,
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
  process.env.DATABASE_URL = original.DATABASE_URL;
  process.env.STORAGE_DRIVER = original.STORAGE_DRIVER;
  process.env.CORS_ORIGINS = original.CORS_ORIGINS;
  process.env.VNPAY_HASH_SECRET = original.VNPAY_HASH_SECRET;
  process.env.MOMO_SECRET_KEY = original.MOMO_SECRET_KEY;
  process.env.ZALOPAY_KEY1 = original.ZALOPAY_KEY1;
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

  it("requires CORS_ORIGINS in production", () => {
    process.env.NODE_ENV = "production";
    process.env.JWT_ACCESS_SECRET = `${"x".repeat(32)}strong-prod-secret`;
    process.env.DATABASE_URL = "postgresql://produser:prodpass@db/edu";
    process.env.STORAGE_DRIVER = "s3";
    delete process.env.CORS_ORIGINS;
    expect(() => assertProductionSecrets()).toThrow(/CORS_ORIGINS/);
  });

  it("requires VNPay secret when that is the default provider", () => {
    process.env.NODE_ENV = "production";
    process.env.JWT_ACCESS_SECRET = `${"x".repeat(32)}strong-prod-secret`;
    process.env.DATABASE_URL = "postgresql://produser:prodpass@db/edu";
    process.env.STORAGE_DRIVER = "s3";
    process.env.CORS_ORIGINS = "https://app.example.com";
    process.env.DEFAULT_PAYMENT_PROVIDER = "vnpay";
    delete process.env.VNPAY_HASH_SECRET;
    expect(() => assertProductionSecrets()).toThrow(/VNPAY_HASH_SECRET/);
  });
});
