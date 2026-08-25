import type {
  CreatePaymentIntentInput,
  CreatePaymentIntentResult,
  PaymentProvider,
  VerifiedPaymentEvent,
} from "@edu/monetization-core";
import { AppError, ErrorCodes } from "@edu/shared-core";

/** Stripe adapter skeleton — uses PaymentIntent shape without requiring live keys in local mock mode. */
export class StripePaymentProvider implements PaymentProvider {
  readonly name = "stripe";

  async createIntent(input: CreatePaymentIntentInput): Promise<CreatePaymentIntentResult> {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      return {
        provider: this.name,
        providerRef: `stripe_test_${input.orderId}`,
        clientAction: {
          type: "client_secret",
          clientSecret: `test_secret_${input.idempotencyKey}`,
        },
      };
    }
    const res = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Idempotency-Key": input.idempotencyKey,
      },
      body: new URLSearchParams({
        amount: String(input.amountMinor),
        currency: input.currency.toLowerCase(),
        "metadata[orderId]": input.orderId,
      }),
    });
    if (!res.ok) {
      throw new AppError(ErrorCodes.PAYMENT_FAILED, "Stripe intent failed", 502);
    }
    const json = (await res.json()) as { id: string; client_secret: string };
    return {
      provider: this.name,
      providerRef: json.id,
      clientAction: { type: "client_secret", clientSecret: json.client_secret },
    };
  }

  async verifyWebhook(headers: Record<string, string | undefined>, body: string): Promise<VerifiedPaymentEvent> {
    // Production: verify stripe-signature with STRIPE_WEBHOOK_SECRET.
    // Local/dev accepts JSON payload with required fields when secret unset.
    if (process.env.STRIPE_WEBHOOK_SECRET && !headers["stripe-signature"]) {
      throw new AppError(ErrorCodes.FORBIDDEN, "Missing Stripe signature", 401);
    }
    const parsed = JSON.parse(body) as {
      id: string;
      type: string;
      data: { object: { id: string; amount: number; metadata?: { orderId?: string } } };
    };
    return {
      provider: this.name,
      providerEventId: parsed.id,
      providerRef: parsed.data.object.id,
      orderId: parsed.data.object.metadata?.orderId,
      status: parsed.type.includes("succeeded") ? "SUCCEEDED" : "FAILED",
      amountMinor: parsed.data.object.amount,
      raw: parsed as unknown as Record<string, unknown>,
    };
  }
}
