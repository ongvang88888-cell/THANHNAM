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
    type: "redirect" | "client_secret" | "noop" | "play_billing";
    url?: string;
    clientSecret?: string;
    /** Google Play product ID / SKU */
    sku?: string;
    packageName?: string;
  };
}

export interface VerifiedPaymentEvent {
  provider: string;
  providerEventId: string;
  providerRef: string;
  orderId?: string;
  status: "SUCCEEDED" | "FAILED" | "REFUNDED";
  amountMinor: number;
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

/** Store-policy aware checkout providers by client platform. */
export function allowedCheckoutProviders(
  platform: "web" | "android" | "ios" | "unknown" = "unknown",
): string[] {
  switch (platform) {
    case "android":
      return ["google_play", "mock"];
    case "ios":
      return ["apple_iap", "mock"];
    case "web":
      return ["mock", "stripe", "vnpay"];
    default:
      return ["mock", "stripe", "vnpay", "google_play"];
  }
}

export function assertProviderAllowedForPlatform(
  provider: string,
  platform: "web" | "android" | "ios" | "unknown" = "unknown",
): void {
  const allowed = allowedCheckoutProviders(platform);
  if (!allowed.includes(provider)) {
    throw new Error(
      `Provider ${provider} is not allowed on platform ${platform}. Allowed: ${allowed.join(", ")}`,
    );
  }
}
