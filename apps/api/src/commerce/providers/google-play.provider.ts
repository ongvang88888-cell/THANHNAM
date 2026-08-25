import type {
  CreatePaymentIntentInput,
  CreatePaymentIntentResult,
  PaymentProvider,
  RefundPaymentInput,
  RefundPaymentResult,
  VerifiedPaymentEvent,
} from "@edu/monetization-core";
import { AppError, ErrorCodes } from "@edu/shared-core";

/**
 * Google Play Billing adapter.
 *
 * createIntent → client runs Play Billing Library with returned SKU.
 * verifyWebhook / confirm → validates purchaseToken (Android Publisher API when configured).
 *
 * Env:
 * - GOOGLE_PLAY_PACKAGE_NAME (required in production)
 * - GOOGLE_PLAY_SERVICE_ACCOUNT_JSON (optional; enables live token verify)
 * - GOOGLE_PLAY_ALLOW_TEST_TOKENS=true (dev: accept gp_test_* tokens)
 */
export class GooglePlayPaymentProvider implements PaymentProvider {
  readonly name = "google_play";

  async createIntent(input: CreatePaymentIntentInput): Promise<CreatePaymentIntentResult> {
    const packageName = process.env.GOOGLE_PLAY_PACKAGE_NAME || "com.educommerce.student";
    const sku =
      input.metadata?.playSku ||
      input.metadata?.sku ||
      input.metadata?.productId ||
      `sku_${input.orderId.slice(0, 12)}`;

    if (!process.env.GOOGLE_PLAY_PACKAGE_NAME && process.env.NODE_ENV === "production") {
      throw new AppError(
        ErrorCodes.PAYMENT_FAILED,
        "GOOGLE_PLAY_PACKAGE_NAME is required in production",
        500,
      );
    }

    return {
      provider: this.name,
      providerRef: `gp_order_${input.orderId}`,
      clientAction: {
        type: "play_billing",
        sku,
        packageName,
      },
    };
  }

  async verifyWebhook(
    _headers: Record<string, string | undefined>,
    body: string,
  ): Promise<VerifiedPaymentEvent> {
    const parsed = JSON.parse(body) as {
      orderId?: string;
      purchaseToken?: string;
      productId?: string;
      amountMinor?: number;
      eventId?: string;
      notificationType?: number;
    };

    if (parsed.notificationType === 12 || parsed.notificationType === 13) {
      // SUBSCRIPTION_REVOKED / refund-like RTDN — treat as refund signal
      return {
        provider: this.name,
        providerEventId: parsed.eventId || `gp_rtdn_${parsed.purchaseToken || "unknown"}`,
        providerRef: parsed.purchaseToken || `gp_order_${parsed.orderId}`,
        orderId: parsed.orderId,
        status: "REFUNDED",
        amountMinor: parsed.amountMinor || 0,
        raw: parsed as unknown as Record<string, unknown>,
      };
    }

    const token = parsed.purchaseToken;
    if (!token) {
      throw new AppError(ErrorCodes.VALIDATION, "purchaseToken required", 400);
    }

    const verified = await this.verifyPurchaseToken(token, parsed.productId);
    if (!verified.ok) {
      throw new AppError(ErrorCodes.FORBIDDEN, verified.reason || "Invalid Play purchase", 401);
    }

    return {
      provider: this.name,
      providerEventId: parsed.eventId || `gp_${token.slice(0, 24)}`,
      providerRef: token,
      orderId: parsed.orderId,
      status: "SUCCEEDED",
      amountMinor: parsed.amountMinor || 0,
      raw: { ...parsed, verify: verified },
    };
  }

  async refund(input: RefundPaymentInput): Promise<RefundPaymentResult> {
    // Live refunds require Android Publisher purchases.products.refund — stub when no SA.
    if (!process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON) {
      if (process.env.NODE_ENV === "production") {
        throw new AppError(
          ErrorCodes.PAYMENT_FAILED,
          "GOOGLE_PLAY_SERVICE_ACCOUNT_JSON required for Play refunds in production",
          500,
        );
      }
      return {
        providerRefundId: `gp_refund_test_${input.orderId}`,
        status: "SUCCEEDED",
        raw: { mode: "test", reason: input.reason },
      };
    }
    // Production path: call Publisher API (same OAuth as verify). Keep explicit for ops.
    return {
      providerRefundId: `gp_refund_pending_${input.orderId}`,
      status: "PENDING",
      raw: {
        note: "Configure Worker/Play Console refund; service account present",
        providerRef: input.providerRef,
      },
    };
  }

  private async verifyPurchaseToken(
    purchaseToken: string,
    productId?: string,
  ): Promise<{ ok: boolean; reason?: string; purchaseState?: number }> {
    const allowTest =
      process.env.GOOGLE_PLAY_ALLOW_TEST_TOKENS !== "false" &&
      process.env.NODE_ENV !== "production";

    if (allowTest && purchaseToken.startsWith("gp_test_")) {
      return { ok: true, purchaseState: 0 };
    }

    const saJson = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
    const packageName = process.env.GOOGLE_PLAY_PACKAGE_NAME;
    if (!saJson || !packageName || !productId) {
      if (process.env.NODE_ENV === "production") {
        return { ok: false, reason: "Play verify not configured" };
      }
      // Dev without SA: accept any non-empty token to unblock mobile UX wiring
      return { ok: purchaseToken.length >= 8, reason: purchaseToken.length < 8 ? "token too short" : undefined };
    }

    try {
      const accessToken = await this.getGoogleAccessToken(saJson);
      const url =
        `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/` +
        `${encodeURIComponent(packageName)}/purchases/products/` +
        `${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        const text = await res.text();
        return { ok: false, reason: `Play API ${res.status}: ${text.slice(0, 200)}` };
      }
      const json = (await res.json()) as { purchaseState?: number };
      // 0 = purchased
      return { ok: json.purchaseState === 0, purchaseState: json.purchaseState, reason: json.purchaseState !== 0 ? "not purchased" : undefined };
    } catch (e) {
      return { ok: false, reason: e instanceof Error ? e.message : "verify failed" };
    }
  }

  private async getGoogleAccessToken(saJson: string): Promise<string> {
    const sa = JSON.parse(saJson) as {
      client_email: string;
      private_key: string;
      token_uri?: string;
    };
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
    const claim = Buffer.from(
      JSON.stringify({
        iss: sa.client_email,
        scope: "https://www.googleapis.com/auth/androidpublisher",
        aud: sa.token_uri || "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
      }),
    ).toString("base64url");
    const { createSign } = await import("node:crypto");
    const signer = createSign("RSA-SHA256");
    signer.update(`${header}.${claim}`);
    const signature = signer.sign(sa.private_key, "base64url");
    const jwt = `${header}.${claim}.${signature}`;
    const tokenRes = await fetch(sa.token_uri || "https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });
    if (!tokenRes.ok) {
      throw new AppError(ErrorCodes.PAYMENT_FAILED, "Google OAuth token failed", 502);
    }
    const tokenJson = (await tokenRes.json()) as { access_token: string };
    return tokenJson.access_token;
  }
}
