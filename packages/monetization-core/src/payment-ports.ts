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
    type: "redirect" | "client_secret" | "noop";
    url?: string;
    clientSecret?: string;
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

export interface PaymentProvider {
  readonly name: string;
  createIntent(input: CreatePaymentIntentInput): Promise<CreatePaymentIntentResult>;
  verifyWebhook(headers: Record<string, string | undefined>, body: string): Promise<VerifiedPaymentEvent>;
}
