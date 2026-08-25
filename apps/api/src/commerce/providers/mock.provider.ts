import type {
  CreatePaymentIntentInput,
  CreatePaymentIntentResult,
  PaymentProvider,
  VerifiedPaymentEvent,
} from "@edu/monetization-core";

export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";

  async createIntent(input: CreatePaymentIntentInput): Promise<CreatePaymentIntentResult> {
    return {
      provider: this.name,
      providerRef: `mock_${input.orderId}`,
      clientAction: { type: "noop" },
    };
  }

  async verifyWebhook(_headers: Record<string, string | undefined>, body: string): Promise<VerifiedPaymentEvent> {
    const parsed = JSON.parse(body) as {
      orderId: string;
      providerRef?: string;
      amountMinor: number;
      eventId?: string;
    };
    return {
      provider: this.name,
      providerEventId: parsed.eventId ?? `mock_evt_${parsed.orderId}`,
      providerRef: parsed.providerRef ?? `mock_${parsed.orderId}`,
      orderId: parsed.orderId,
      status: "SUCCEEDED",
      amountMinor: parsed.amountMinor,
      raw: parsed as unknown as Record<string, unknown>,
    };
  }
}
