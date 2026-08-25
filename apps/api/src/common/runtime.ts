/** Production vs development runtime gates. Never trust client flags. */

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function allowMockPayments(): boolean {
  if (!isProduction()) return true;
  return process.env.ALLOW_MOCK_PAYMENTS === "true";
}

export function allowDevSsv(): boolean {
  if (isProduction()) return process.env.ALLOW_DEV_SSV === "true";
  return process.env.ADMOB_SSV_ENFORCE !== "true";
}

export function allowIapTestTokens(): boolean {
  if (isProduction()) return process.env.ALLOW_IAP_TEST_TOKENS === "true";
  return process.env.GOOGLE_PLAY_ALLOW_TEST_TOKENS !== "false";
}

export function allowLocalMedia(): boolean {
  if (!isProduction()) return true;
  return process.env.ALLOW_LOCAL_MEDIA === "true";
}

export function jwtAccessSecret(): string {
  const secret = process.env.JWT_ACCESS_SECRET || "";
  if (isProduction()) {
    if (secret.length < 32 || /change-me|dev-access/i.test(secret)) {
      throw new Error("JWT_ACCESS_SECRET must be a strong 32+ char secret in production");
    }
    return secret;
  }
  return secret || "dev-access-secret-change-me-32chars!!";
}

export function corsOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS?.trim();
  if (raw) {
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3002",
    "http://localhost:3003",
    "http://localhost:3004",
    "http://localhost:8081",
    "http://127.0.0.1:8081",
  ];
}

export function defaultPaymentProvider(): string {
  const configured = process.env.DEFAULT_PAYMENT_PROVIDER || "";
  if (isProduction() && (!configured || configured === "mock") && !allowMockPayments()) {
    return "vnpay";
  }
  return configured || "mock";
}

export function vnSubscriptionProviders(): readonly string[] {
  return ["vnpay", "momo", "zalopay"] as const;
}

export function assertProviderForEnvironment(provider: string): void {
  if (provider === "mock" && !allowMockPayments()) {
    throw new Error("Mock payments are disabled in this environment");
  }
}

export function vatBps(): number {
  const n = Number(process.env.INVOICE_VAT_BPS || 0);
  if (!Number.isFinite(n) || n < 0 || n > 20_000) return 0;
  return Math.floor(n);
}

export function computeInvoiceAmounts(totalMinor: number, discountMinor: number, bps = vatBps()) {
  const subtotal = Math.max(0, totalMinor);
  const vatMinor = Math.round((subtotal * bps) / 10_000);
  return {
    subtotalMinor: subtotal,
    vatBps: bps,
    vatMinor,
    totalMinor: subtotal + vatMinor,
    discountMinor,
  };
}

const WEAK_SECRETS = /change-me|dev-access|minio123|Password123/i;

export function assertProductionSecrets(): void {
  if (!isProduction()) return;
  jwtAccessSecret();
  const db = process.env.DATABASE_URL || "";
  if (!db) throw new Error("DATABASE_URL is required in production");
  if (WEAK_SECRETS.test(db)) {
    throw new Error("DATABASE_URL looks like a local/dev credential");
  }
  if ((process.env.STORAGE_DRIVER || "memory") === "memory" && !allowLocalMedia()) {
    throw new Error("STORAGE_DRIVER=memory is not allowed in production");
  }
}
