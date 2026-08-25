import type {
  CreatePaymentIntentInput,
  CreatePaymentIntentResult,
  PaymentProvider,
  RefundPaymentInput,
  RefundPaymentResult,
  VerifiedPaymentEvent,
} from "@edu/monetization-core";
import { verifyStripeWebhookSignature } from "@edu/monetization-core";
import { AppError, ErrorCodes } from "@edu/shared-core";

/** Stripe adapter — PaymentIntent + webhook HMAC + refunds. */
export class StripePaymentProvider implements PaymentProvider {
  readonly name = "stripe";

  async createIntent(input: CreatePaymentIntentInput): Promise<CreatePaymentIntentResult> {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      if (process.env.NODE_ENV === "production") {
        throw new AppError(
          ErrorCodes.PAYMENT_FAILED,
          "STRIPE_SECRET_KEY is required in production",
          500,
        );
      }
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

  async verifyWebhook(
    headers: Record<string, string | undefined>,
    body: string,
  ): Promise<VerifiedPaymentEvent> {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (secret) {
      const sig = headers["stripe-signature"];
      if (!verifyStripeWebhookSignature(body, sig, secret)) {
        throw new AppError(ErrorCodes.FORBIDDEN, "Invalid Stripe signature", 401);
      }
    } else if (process.env.NODE_ENV === "production") {
      throw new AppError(ErrorCodes.FORBIDDEN, "STRIPE_WEBHOOK_SECRET required in production", 500);
    }

    const parsed = JSON.parse(body) as {
      id: string;
      type: string;
      data: {
        object: {
          id: string;
          amount: number;
          payment_intent?: string;
          metadata?: { orderId?: string };
        };
      };
    };
    const isRefund = parsed.type.includes("refund") || parsed.type === "charge.refunded";
    return {
      provider: this.name,
      providerEventId: parsed.id,
      providerRef: parsed.data.object.payment_intent || parsed.data.object.id,
      orderId: parsed.data.object.metadata?.orderId,
      status: isRefund ? "REFUNDED" : parsed.type.includes("succeeded") ? "SUCCEEDED" : "FAILED",
      amountMinor: parsed.data.object.amount,
      raw: parsed as unknown as Record<string, unknown>,
    };
  }

  async refund(input: RefundPaymentInput): Promise<RefundPaymentResult> {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      if (process.env.NODE_ENV === "production") {
        throw new AppError(ErrorCodes.PAYMENT_FAILED, "STRIPE_SECRET_KEY required for refunds", 500);
      }
      return {
        providerRefundId: `re_test_${input.orderId}`,
        status: "SUCCEEDED",
        raw: { mode: "test", reason: input.reason },
      };
    }
    const res = await fetch("https://api.stripe.com/v1/refunds", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        payment_intent: input.providerRef,
        amount: String(input.amountMinor),
        "metadata[orderId]": input.orderId,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new AppError(ErrorCodes.PAYMENT_FAILED, `Stripe refund failed: ${text.slice(0, 200)}`, 502);
    }
    const json = (await res.json()) as { id: string; status: string };
    return {
      providerRefundId: json.id,
      status: json.status === "succeeded" ? "SUCCEEDED" : "PENDING",
      raw: json as unknown as Record<string, unknown>,
    };
  }
}
