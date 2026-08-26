import { createHmac, randomUUID } from "node:crypto";
import type {
  CreatePaymentIntentInput,
  CreatePaymentIntentResult,
  PaymentProvider,
  VerifiedPaymentEvent,
} from "@edu/monetization-core";
import { AppError, ErrorCodes } from "@edu/shared-core";

/**
 * ZaloPay adapter — sandbox-friendly redirect + MAC verify.
 * Production requires ZALOPAY_APP_ID + ZALOPAY_KEY1 (+ KEY2 for callbacks).
 */
export class ZalopayPaymentProvider implements PaymentProvider {
  readonly name = "zalopay";

  async createIntent(input: CreatePaymentIntentInput): Promise<CreatePaymentIntentResult> {
    const appId = process.env.ZALOPAY_APP_ID || "2553";
    const key1 = process.env.ZALOPAY_KEY1;
    if (!key1 && process.env.NODE_ENV === "production") {
      throw new AppError(ErrorCodes.PAYMENT_FAILED, "ZALOPAY_KEY1 required in production", 500);
    }
    const macKey = key1 || "demo_zalopay_key1";
    const appTransId = `${new Date().toISOString().slice(2, 10).replace(/-/g, "")}_${input.orderId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 24) || randomUUID().slice(0, 8)}`;
    const amount = String(input.amountMinor);
    const embedData = "{}";
    const item = "[]";
    const description = `Order ${input.orderId}`;
    const data = `${appId}|${appTransId}|${input.orderId}|${amount}|${Date.now()}|${embedData}|${item}`;
    const mac = createHmac("sha256", macKey).update(data).digest("hex");
    const returnUrl = input.returnUrl || "http://localhost:3000/checkout/return";

    if (!key1) {
      const qs = new URLSearchParams({
        appid: appId,
        apptransid: appTransId,
        amount,
        status: "1",
        checksum: mac,
        description,
      });
      return {
        provider: this.name,
        providerRef: appTransId,
        clientAction: {
          type: "redirect",
          url: `${returnUrl}${returnUrl.includes("?") ? "&" : "?"}zalopay=1&${qs.toString()}`,
        },
      };
    }

    const base = process.env.ZALOPAY_URL || "https://sb-openapi.zalopay.vn/v2/create";
    return {
      provider: this.name,
      providerRef: appTransId,
      clientAction: {
        type: "redirect",
        url: `${base}?app_trans_id=${encodeURIComponent(appTransId)}&mac=${mac}`,
      },
    };
  }

  async verifyWebhook(_headers: Record<string, string | undefined>, body: string): Promise<VerifiedPaymentEvent> {
    const params = this.parseBody(body);
    const key2 = process.env.ZALOPAY_KEY2 || process.env.ZALOPAY_KEY1 || "demo_zalopay_key1";
    const checksum = params.checksum || params.mac;
    const appTransId = params.apptransid || params.app_trans_id || "";
    const amount = params.amount || "0";
    const status = params.status || params.return_code || "";
    if (!checksum) throw new AppError(ErrorCodes.FORBIDDEN, "Missing ZaloPay checksum", 401);

    // Callback MAC: appid|apptransid|appamount|appstatus (simplified for adapter)
    const appId = params.appid || process.env.ZALOPAY_APP_ID || "2553";
    const data = `${appId}|${appTransId}|${amount}|${status}`;
    const expected = createHmac("sha256", key2).update(data).digest("hex");
    const liveKeys = Boolean(process.env.ZALOPAY_KEY1 || process.env.ZALOPAY_KEY2);
    if (liveKeys && checksum !== expected) {
      throw new AppError(ErrorCodes.FORBIDDEN, "Invalid ZaloPay checksum", 401);
    }
    const ok = status === "1" || status === "0" || status === "";
    return {
      provider: this.name,
      providerEventId: `zp_${appTransId}_${params.zptransid || params.zp_trans_id || "0"}`,
      providerRef: appTransId,
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
