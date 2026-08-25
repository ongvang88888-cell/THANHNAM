export interface CreatePaymentIntentInput {
  orderId: string;
  amountMinor: number;
  currency: string;
  idempotencyKey: string;
  returnUrl?: string;
  metadata?: Record<string, string>;
}

export interface CreatePaymentIntentResult {
  provider: string;
  providerRef: string;
  clientAction: {
    type: "redirect" | "client_secret" | "noop" | "play_billing" | "apple_iap";
    url?: string;
    clientSecret?: string;
    /** Store product ID / SKU (Play or Apple) */
    sku?: string;
    packageName?: string;
    /** iOS bundle id */
    bundleId?: string;
    /**
     * UUID passed to StoreKit as appAccountToken so ASN/webhooks can
     * correlate back to our order without trusting client orderId alone.
     */
    appAccountToken?: string;
  };
}

export interface VerifiedPaymentEvent {
  provider: string;
  providerEventId: string;
  providerRef: string;
  orderId?: string;
  status: "SUCCEEDED" | "FAILED" | "REFUNDED";
  amountMinor: number;
  /** Verified store SKU when available */
  sku?: string;
  /** Apple appAccountToken (UUID) when present */
  appAccountToken?: string;
  raw: Record<string, unknown>;
}

export interface RefundPaymentInput {
  providerRef: string;
  amountMinor: number;
  reason?: string;
  orderId: string;
}

export interface RefundPaymentResult {
  providerRefundId: string;
  status: "SUCCEEDED" | "PENDING" | "FAILED";
  raw: Record<string, unknown>;
}

export interface PaymentProvider {
  readonly name: string;
  createIntent(input: CreatePaymentIntentInput): Promise<CreatePaymentIntentResult>;
  verifyWebhook(headers: Record<string, string | undefined>, body: string): Promise<VerifiedPaymentEvent>;
  /** Optional — providers that support server-initiated refunds */
  refund?(input: RefundPaymentInput): Promise<RefundPaymentResult>;
}

export type CheckoutPlatform = "web" | "android" | "ios" | "unknown";

/**
 * Central store / checkout policy (D3).
 * Keep platform rules here — never scatter provider allowlists across UI.
 */
export const PaymentPolicyConfig = {
  webProviders: ["mock", "stripe", "vnpay", "momo", "zalopay"] as const,
  androidProviders: ["google_play", "mock"] as const,
  iosProviders: ["apple_iap", "mock"] as const,
  /** Dev / unknown clients may hit any adapter for tooling */
  unknownProviders: [
    "mock",
    "stripe",
    "vnpay",
    "momo",
    "zalopay",
    "google_play",
    "apple_iap",
  ] as const,
};

/** Store-policy aware checkout providers by client platform. */
export function allowedCheckoutProviders(platform: CheckoutPlatform = "unknown"): string[] {
  switch (platform) {
    case "android":
      return [...PaymentPolicyConfig.androidProviders];
    case "ios":
      return [...PaymentPolicyConfig.iosProviders];
    case "web":
      return [...PaymentPolicyConfig.webProviders];
    default:
      return [...PaymentPolicyConfig.unknownProviders];
  }
}

export function assertProviderAllowedForPlatform(
  provider: string,
  platform: CheckoutPlatform = "unknown",
): void {
  const allowed = allowedCheckoutProviders(platform);
  if (!allowed.includes(provider)) {
    throw new Error(
      `Provider ${provider} is not allowed on platform ${platform}. Allowed: ${allowed.join(", ")}`,
    );
  }
}

/** Pick default store provider for a platform (non-mock). */
export function defaultStoreProvider(platform: CheckoutPlatform): string | null {
  switch (platform) {
    case "android":
      return "google_play";
    case "ios":
      return "apple_iap";
    default:
      return null;
  }
}

/**
 * Resolve SKU from product metadata for a store provider.
 * Prefer explicit playSku / appleSku; fall back to slug.
 */
export function resolveStoreSku(
  provider: string,
  meta: Record<string, unknown>,
  fallbackSlug: string,
): string {
  if (provider === "google_play") {
    const play = meta.playSku;
    if (typeof play === "string" && play.length > 0) return play;
  }
  if (provider === "apple_iap") {
    const apple = meta.appleSku;
    if (typeof apple === "string" && apple.length > 0) return apple;
  }
  const generic = meta.sku;
  if (typeof generic === "string" && generic.length > 0) return generic;
  return fallbackSlug;
}

/** Enforce that a verified store SKU matches what we issued at checkout. */
export function assertSkuMatchesExpected(expectedSku: string | undefined, actualSku: string | undefined): void {
  if (!expectedSku || !actualSku) return;
  if (expectedSku !== actualSku) {
    throw new Error(`Store SKU mismatch: expected ${expectedSku}, got ${actualSku}`);
  }
}
