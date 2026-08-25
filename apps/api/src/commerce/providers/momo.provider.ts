import { createHmac, randomUUID } from "node:crypto";
import type {
  CreatePaymentIntentInput,
  CreatePaymentIntentResult,
  PaymentProvider,
  VerifiedPaymentEvent,
} from "@edu/monetization-core";
import { AppError, ErrorCodes } from "@edu/shared-core";

/**
 * MoMo adapter — sandbox-friendly redirect + HMAC verify.
 * Production requires MOMO_PARTNER_CODE + MOMO_ACCESS_KEY + MOMO_SECRET_KEY.
 */
export class MomoPaymentProvider implements PaymentProvider {
  readonly name = "momo";

  async createIntent(input: CreatePaymentIntentInput): Promise<CreatePaymentIntentResult> {
    const partnerCode = process.env.MOMO_PARTNER_CODE || "MOMO_DEMO";
    const accessKey = process.env.MOMO_ACCESS_KEY || "demo_access";
    const secret = process.env.MOMO_SECRET_KEY;
    if (!secret && process.env.NODE_ENV === "production") {
      throw new AppError(ErrorCodes.PAYMENT_FAILED, "MOMO_SECRET_KEY required in production", 500);
    }
    const hashSecret = secret || "demo_momo_secret";
    const requestId = randomUUID().replace(/-/g, "");
    const orderId = input.orderId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 40) || requestId;
    const amount = String(input.amountMinor);
    const returnUrl = input.returnUrl || "http://localhost:3000/checkout/return";
    const notifyUrl = process.env.MOMO_NOTIFY_URL || "http://localhost:4000/payments/webhooks/momo";
    const extraData = "";
    const orderInfo = `Order ${input.orderId}`;
    const requestType = "captureWallet";
    const raw =
      `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${notifyUrl}` +
      `&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}` +
      `&redirectUrl=${returnUrl}&requestId=${requestId}&requestType=${requestType}`;
    const signature = createHmac("sha256", hashSecret).update(raw).digest("hex");
    const base = process.env.MOMO_URL || "https://test-payment.momo.vn/v2/gateway/api/create";
    // Sandbox without live credentials: return a local redirect that carries signed params
    // so webhook/verify can still be exercised in dev.
    if (!secret) {
      const qs = new URLSearchParams({
        partnerCode,
        orderId,
        requestId,
        amount,
        resultCode: "0",
        message: "Success",
        signature,
        orderInfo,
      });
      return {
        provider: this.name,
        providerRef: orderId,
        clientAction: {
          type: "redirect",
          url: `${returnUrl}${returnUrl.includes("?") ? "&" : "?"}momo=1&${qs.toString()}`,
        },
      };
    }
    const url = `${base}?orderId=${encodeURIComponent(orderId)}&requestId=${encodeURIComponent(requestId)}&signature=${signature}`;
    return {
      provider: this.name,
      providerRef: orderId,
      clientAction: { type: "redirect", url },
    };
  }

  async verifyWebhook(_headers: Record<string, string | undefined>, body: string): Promise<VerifiedPaymentEvent> {
    const params = this.parseBody(body);
    const secret = process.env.MOMO_SECRET_KEY || "demo_momo_secret";
    const accessKey = process.env.MOMO_ACCESS_KEY || "demo_access";
    const signature = params.signature;
    if (!signature) throw new AppError(ErrorCodes.FORBIDDEN, "Missing MoMo signature", 401);

    const amount = params.amount || "0";
    const orderId = params.orderId || "";
    const requestId = params.requestId || "";
    const orderInfo = params.orderInfo || "";
    const partnerCode = params.partnerCode || process.env.MOMO_PARTNER_CODE || "MOMO_DEMO";
    const resultCode = params.resultCode || "";
    const message = params.message || "";
    const raw =
      `accessKey=${accessKey}&amount=${amount}&extraData=${params.extraData || ""}` +
      `&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${params.orderType || ""}` +
      `&partnerCode=${partnerCode}&payType=${params.payType || ""}&requestId=${requestId}` +
      `&responseTime=${params.responseTime || ""}&resultCode=${resultCode}&transId=${params.transId || ""}`;
    const expected = createHmac("sha256", secret).update(raw).digest("hex");
    // In demo mode accept either full IPN signature or createIntent signature subset
    const demoRaw =
      `accessKey=${accessKey}&amount=${amount}&extraData=&ipnUrl=` +
      `&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}` +
      `&redirectUrl=&requestId=${requestId}&requestType=captureWallet`;
    const demoExpected = createHmac("sha256", secret).update(demoRaw).digest("hex");
    if (
      process.env.MOMO_SECRET_KEY &&
      signature !== expected &&
      signature !== demoExpected
    ) {
      throw new AppError(ErrorCodes.FORBIDDEN, "Invalid MoMo signature", 401);
    }
    const ok = resultCode === "0" || resultCode === "9000" || (!resultCode && !!orderId);
    return {
      provider: this.name,
      providerEventId: `momo_${orderId}_${params.transId || requestId || "0"}`,
      providerRef: orderId,
      status: ok ? "SUCCEEDED" : "FAILED",
      amountMinor: Number(amount) || 0,
      raw: params,
    };
  }

  private parseBody(body: string): Record<string, string> {
    const trimmed = body.trim();
    if (trimmed.startsWith("{")) {
      return JSON.parse(trimmed) as Record<string, string>;
    }
    const params = new URLSearchParams(trimmed.startsWith("?") ? trimmed.slice(1) : trimmed);
    const out: Record<string, string> = {};
    for (const [k, v] of params.entries()) out[k] = v;
    return out;
  }
}
