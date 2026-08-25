import { createSign, randomUUID } from "node:crypto";
import type {
  CreatePaymentIntentInput,
  CreatePaymentIntentResult,
  PaymentProvider,
  RefundPaymentInput,
  RefundPaymentResult,
  VerifiedPaymentEvent,
} from "@edu/monetization-core";
import { AppError, ErrorCodes } from "@edu/shared-core";

type AppleTx = {
  transactionId?: string;
  originalTransactionId?: string;
  productId?: string;
  appAccountToken?: string;
  type?: string;
  revocationDate?: number;
  environment?: string;
};

/**
 * Apple In-App Purchase adapter (StoreKit 2 / App Store Server API).
 *
 * createIntent → clientAction.apple_iap + appAccountToken (UUID).
 * confirm / ASN V2 → verify transaction (API when keys set; iap_test_* in non-prod).
 *
 * Env:
 * - APPLE_IAP_BUNDLE_ID (required in production)
 * - APPLE_IAP_ISSUER_ID + APPLE_IAP_KEY_ID + APPLE_IAP_PRIVATE_KEY (App Store Connect API key)
 * - APPLE_IAP_USE_SANDBOX=true (default outside production)
 * - APPLE_IAP_ALLOW_TEST_TOKENS (default true outside production)
 */
export class AppleIapPaymentProvider implements PaymentProvider {
  readonly name = "apple_iap";

  async createIntent(input: CreatePaymentIntentInput): Promise<CreatePaymentIntentResult> {
    const bundleId = process.env.APPLE_IAP_BUNDLE_ID || "com.educommerce.student";
    const sku =
      input.metadata?.appleSku ||
      input.metadata?.sku ||
      input.metadata?.playSku ||
      input.metadata?.productId ||
      `sku_${input.orderId.slice(0, 12)}`;

    if (!process.env.APPLE_IAP_BUNDLE_ID && process.env.NODE_ENV === "production") {
      throw new AppError(
        ErrorCodes.PAYMENT_FAILED,
        "APPLE_IAP_BUNDLE_ID is required in production",
        500,
      );
    }

    const appAccountToken = input.metadata?.appAccountToken || randomUUID();

    return {
      provider: this.name,
      providerRef: `apple_order_${input.orderId}`,
      clientAction: {
        type: "apple_iap",
        sku,
        bundleId,
        appAccountToken,
      },
    };
  }

  async verifyWebhook(
    _headers: Record<string, string | undefined>,
    body: string,
  ): Promise<VerifiedPaymentEvent> {
    const parsed = JSON.parse(body) as Record<string, unknown>;

    // App Store Server Notifications V2
    if (typeof parsed.signedPayload === "string") {
      return this.verifyAsnV2(parsed.signedPayload);
    }

    // Client confirm path
    const transactionId = String(parsed.transactionId || parsed.purchaseToken || "");
    if (!transactionId) {
      throw new AppError(ErrorCodes.VALIDATION, "transactionId required", 400);
    }

    const signedTransaction =
      typeof parsed.signedTransaction === "string" ? parsed.signedTransaction : undefined;
    const tx = await this.resolveTransaction({
      transactionId,
      signedTransaction,
      productId: typeof parsed.productId === "string" ? parsed.productId : undefined,
    });

    if (tx.revocationDate) {
      return {
        provider: this.name,
        providerEventId: String(parsed.eventId || `apple_refund_${tx.transactionId}`),
        providerRef: tx.originalTransactionId || tx.transactionId || transactionId,
        orderId: typeof parsed.orderId === "string" ? parsed.orderId : undefined,
        status: "REFUNDED",
        amountMinor: Number(parsed.amountMinor) || 0,
        sku: tx.productId,
        appAccountToken: tx.appAccountToken,
        raw: { ...parsed, tx },
      };
    }

    return {
      provider: this.name,
      providerEventId: String(parsed.eventId || `apple_${tx.transactionId || transactionId}`),
      providerRef: tx.transactionId || transactionId,
      orderId: typeof parsed.orderId === "string" ? parsed.orderId : undefined,
      status: "SUCCEEDED",
      amountMinor: Number(parsed.amountMinor) || 0,
      sku: tx.productId,
      appAccountToken: tx.appAccountToken,
      raw: { ...parsed, tx },
    };
  }

  async refund(input: RefundPaymentInput): Promise<RefundPaymentResult> {
    // Apple refunds are typically initiated in App Store Connect / customer; server
    // revoke is driven by ASN REFUND. Stub succeeds in non-prod for admin UI flow.
    if (process.env.NODE_ENV === "production" && !this.hasApiCredentials()) {
      throw new AppError(
        ErrorCodes.PAYMENT_FAILED,
        "Apple refunds in production are ASN-driven; configure App Store Server API keys",
        500,
      );
    }
    return {
      providerRefundId: `apple_refund_${input.orderId}`,
      status: "SUCCEEDED",
      raw: { mode: this.hasApiCredentials() ? "asn_or_manual" : "test", reason: input.reason },
    };
  }

  private async verifyAsnV2(signedPayload: string): Promise<VerifiedPaymentEvent> {
    const notification = this.decodeJwsPayload<{
      notificationType?: string;
      subtype?: string;
      notificationUUID?: string;
      data?: { signedTransactionInfo?: string; bundleId?: string };
    }>(signedPayload);

    const signedTx = notification.data?.signedTransactionInfo;
    const tx = signedTx
      ? this.decodeJwsPayload<AppleTx>(signedTx)
      : ({} as AppleTx);

    const type = String(notification.notificationType || "").toUpperCase();
    const isRefund =
      type === "REFUND" ||
      type === "REVOKE" ||
      type === "REFUND_REVERSED" ||
      Boolean(tx.revocationDate);

    if (isRefund) {
      return {
        provider: this.name,
        providerEventId: notification.notificationUUID || `apple_asn_refund_${tx.transactionId}`,
        providerRef: tx.originalTransactionId || tx.transactionId || "unknown",
        status: "REFUNDED",
        amountMinor: 0,
        sku: tx.productId,
        appAccountToken: tx.appAccountToken,
        raw: { notification, tx },
      };
    }

    // Authoritative re-check when API keys present
    if (tx.transactionId && this.hasApiCredentials()) {
      const live = await this.fetchTransaction(tx.transactionId);
      if (live.revocationDate) {
        return {
          provider: this.name,
          providerEventId: notification.notificationUUID || `apple_asn_${tx.transactionId}`,
          providerRef: live.transactionId || tx.transactionId,
          status: "REFUNDED",
          amountMinor: 0,
          sku: live.productId || tx.productId,
          appAccountToken: live.appAccountToken || tx.appAccountToken,
          raw: { notification, tx: live },
        };
      }
    }

    return {
      provider: this.name,
      providerEventId: notification.notificationUUID || `apple_asn_${tx.transactionId || "unknown"}`,
      providerRef: tx.transactionId || tx.originalTransactionId || "unknown",
      status: "SUCCEEDED",
      amountMinor: 0,
      sku: tx.productId,
      appAccountToken: tx.appAccountToken,
      raw: { notification, tx },
    };
  }

  private async resolveTransaction(input: {
    transactionId: string;
    signedTransaction?: string;
    productId?: string;
  }): Promise<AppleTx> {
    const allowTest =
      process.env.NODE_ENV !== "production"
        ? process.env.APPLE_IAP_ALLOW_TEST_TOKENS !== "false"
        : process.env.ALLOW_IAP_TEST_TOKENS === "true";

    if (allowTest && input.transactionId.startsWith("iap_test_")) {
      return {
        transactionId: input.transactionId,
        originalTransactionId: input.transactionId,
        productId: input.productId,
        environment: "Xcode",
      };
    }

    if (this.hasApiCredentials()) {
      return this.fetchTransaction(input.transactionId);
    }

    if (input.signedTransaction && process.env.NODE_ENV !== "production") {
      // Dev-only: decode JWS payload without full Apple root chain verify.
      const tx = this.decodeJwsPayload<AppleTx>(input.signedTransaction);
      if (!tx.transactionId) {
        throw new AppError(ErrorCodes.FORBIDDEN, "Invalid Apple signedTransaction", 401);
      }
      return tx;
    }

    if (process.env.NODE_ENV === "production") {
      throw new AppError(
        ErrorCodes.PAYMENT_FAILED,
        "Apple IAP verification not configured (need App Store Server API keys)",
        500,
      );
    }

    if (input.transactionId.length < 8) {
      throw new AppError(ErrorCodes.FORBIDDEN, "transactionId too short", 401);
    }
    return {
      transactionId: input.transactionId,
      productId: input.productId,
      environment: "Local",
    };
  }

  private hasApiCredentials(): boolean {
    return Boolean(
      process.env.APPLE_IAP_ISSUER_ID &&
        process.env.APPLE_IAP_KEY_ID &&
        process.env.APPLE_IAP_PRIVATE_KEY,
    );
  }

  private useSandbox(): boolean {
    if (process.env.APPLE_IAP_USE_SANDBOX === "true") return true;
    if (process.env.APPLE_IAP_USE_SANDBOX === "false") return false;
    return process.env.NODE_ENV !== "production";
  }

  private async fetchTransaction(transactionId: string): Promise<AppleTx> {
    const token = this.createAppStoreConnectToken();
    const host = this.useSandbox()
      ? "https://api.storekit-sandbox.itunes.apple.com"
      : "https://api.storekit.itunes.apple.com";
    const res = await fetch(`${host}/inApps/v1/transactions/${encodeURIComponent(transactionId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new AppError(
        ErrorCodes.FORBIDDEN,
        `Apple transaction lookup failed: ${res.status} ${text.slice(0, 200)}`,
        401,
      );
    }
    const json = (await res.json()) as { signedTransactionInfo?: string };
    if (!json.signedTransactionInfo) {
      throw new AppError(ErrorCodes.FORBIDDEN, "Apple response missing signedTransactionInfo", 401);
    }
    return this.decodeJwsPayload<AppleTx>(json.signedTransactionInfo);
  }

  /** ES256 JWT for App Store Server API (App Store Connect API key). */
  private createAppStoreConnectToken(): string {
    const issuerId = process.env.APPLE_IAP_ISSUER_ID!;
    const keyId = process.env.APPLE_IAP_KEY_ID!;
    let privateKey = process.env.APPLE_IAP_PRIVATE_KEY!;
    // Allow escaped newlines from env files
    privateKey = privateKey.replace(/\\n/g, "\n");
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: "ES256", kid: keyId, typ: "JWT" })).toString(
      "base64url",
    );
    const payload = Buffer.from(
      JSON.stringify({
        iss: issuerId,
        iat: now,
        exp: now + 3500,
        aud: "appstoreconnect-v1",
        bid: process.env.APPLE_IAP_BUNDLE_ID || "com.educommerce.student",
      }),
    ).toString("base64url");
    const signer = createSign("SHA256");
    signer.update(`${header}.${payload}`);
    signer.end();
    const signature = signer.sign(privateKey);
    // ES256 requires IEEE P1363 (r||s) — Node sign() returns DER; convert.
    const p1363 = this.derToJose(signature);
    return `${header}.${payload}.${p1363.toString("base64url")}`;
  }

  /** Convert ECDSA DER signature to JOSE (R||S) for ES256. */
  private derToJose(der: Buffer): Buffer {
    // Minimal DER parse: 0x30 len 0x02 rlen r 0x02 slen s
    let offset = 2;
    if (der[0] !== 0x30) return der;
    if (der[1] & 0x80) offset = 3;
    if (der[offset] !== 0x02) return der;
    const rLen = der[offset + 1];
    let r = der.subarray(offset + 2, offset + 2 + rLen);
    offset = offset + 2 + rLen;
    if (der[offset] !== 0x02) return der;
    const sLen = der[offset + 1];
    let s = der.subarray(offset + 2, offset + 2 + sLen);
    // Strip leading zeros / left-pad to 32 bytes
    while (r.length > 32 && r[0] === 0) r = r.subarray(1);
    while (s.length > 32 && s[0] === 0) s = s.subarray(1);
    const out = Buffer.alloc(64);
    r.copy(out, 32 - r.length);
    s.copy(out, 64 - s.length);
    return out;
  }

  private decodeJwsPayload<T>(jws: string): T {
    const parts = jws.split(".");
    if (parts.length < 2) {
      throw new AppError(ErrorCodes.VALIDATION, "Invalid JWS", 400);
    }
    try {
      const json = Buffer.from(parts[1]!, "base64url").toString("utf8");
      return JSON.parse(json) as T;
    } catch {
      throw new AppError(ErrorCodes.VALIDATION, "Invalid JWS payload", 400);
    }
  }
}
