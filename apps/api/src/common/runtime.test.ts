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

function restore(key: string) {
  if (original[key] === undefined) delete process.env[key];
  else process.env[key] = original[key];
}

afterEach(() => {
  for (const key of [
    "NODE_ENV",
    "ALLOW_MOCK_PAYMENTS",
    "DEFAULT_PAYMENT_PROVIDER",
    "JWT_ACCESS_SECRET",
    "DATABASE_URL",
    "STORAGE_DRIVER",
    "CORS_ORIGINS",
    "VNPAY_HASH_SECRET",
    "MOMO_SECRET_KEY",
    "ZALOPAY_KEY1",
    "PUBLIC_WEB_URL",
    "SELL_ON_PLAY",
    "GOOGLE_PLAY_PACKAGE_NAME",
    "GOOGLE_PLAY_SERVICE_ACCOUNT_JSON",
    "ALLOW_IAP_TEST_TOKENS",
    "ALLOW_INSECURE_PUBLIC_URL",
    "ALLOW_LOCAL_PUBLIC_WEB",
  ]) {
    restore(key);
  }
});

function withProdBase() {
  process.env.NODE_ENV = "production";
  process.env.JWT_ACCESS_SECRET = `${"x".repeat(32)}strong-prod-secret`;
  process.env.DATABASE_URL = "postgresql://produser:prodpass@db/edu";
  process.env.STORAGE_DRIVER = "s3";
  process.env.CORS_ORIGINS = "https://app.example.com";
  process.env.DEFAULT_PAYMENT_PROVIDER = "vnpay";
  process.env.VNPAY_HASH_SECRET = "vnpay-hash-not-a-placeholder";
  process.env.PUBLIC_WEB_URL = "https://app.example.com";
  delete process.env.SELL_ON_PLAY;
}

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
    withProdBase();
    delete process.env.CORS_ORIGINS;
    expect(() => assertProductionSecrets()).toThrow(/CORS_ORIGINS/);
  });

  it("requires VNPay secret when that is the default provider", () => {
    withProdBase();
    delete process.env.VNPAY_HASH_SECRET;
    expect(() => assertProductionSecrets()).toThrow(/VNPAY_HASH_SECRET/);
  });

  it("requires a public https PUBLIC_WEB_URL", () => {
    withProdBase();
    delete process.env.PUBLIC_WEB_URL;
    expect(() => assertProductionSecrets()).toThrow(/PUBLIC_WEB_URL/);
    process.env.PUBLIC_WEB_URL = "http://127.0.0.1:3000";
    expect(() => assertProductionSecrets()).toThrow(/PUBLIC_WEB_URL/);
    process.env.PUBLIC_WEB_URL = "https://school.example.com";
    expect(() => assertProductionSecrets()).not.toThrow();
  });

  it("does not require Play credentials unless SELL_ON_PLAY=true", () => {
    withProdBase();
    delete process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
    expect(() => assertProductionSecrets()).not.toThrow();
  });

  it("requires a real Play service account when SELL_ON_PLAY=true", () => {
    withProdBase();
    process.env.SELL_ON_PLAY = "true";
    process.env.GOOGLE_PLAY_PACKAGE_NAME = "com.educommerce.student";
    delete process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
    expect(() => assertProductionSecrets()).toThrow(/GOOGLE_PLAY_SERVICE_ACCOUNT_JSON/);

    process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON = JSON.stringify({
      type: "service_account",
      client_email: "play@example.iam.gserviceaccount.com",
    });
    process.env.ALLOW_IAP_TEST_TOKENS = "true";
    expect(() => assertProductionSecrets()).toThrow(/ALLOW_IAP_TEST_TOKENS/);

    delete process.env.ALLOW_IAP_TEST_TOKENS;
    expect(() => assertProductionSecrets()).not.toThrow();
  });
});
