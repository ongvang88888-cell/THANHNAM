import { createHmac } from "node:crypto";
import type {
  CreatePaymentIntentInput,
  CreatePaymentIntentResult,
  PaymentProvider,
  VerifiedPaymentEvent,
} from "@edu/monetization-core";
import { AppError, ErrorCodes } from "@edu/shared-core";

/** VNPay adapter — builds redirect URL; verifies return/IPN hash. */
export class VnpayPaymentProvider implements PaymentProvider {
  readonly name = "vnpay";

  async createIntent(input: CreatePaymentIntentInput): Promise<CreatePaymentIntentResult> {
    const tmn = process.env.VNPAY_TMN_CODE;
    const secret = process.env.VNPAY_HASH_SECRET;
    if ((!tmn || !secret) && process.env.NODE_ENV === "production") {
      throw new AppError(
        ErrorCodes.PAYMENT_FAILED,
        "VNPAY_TMN_CODE and VNPAY_HASH_SECRET are required in production",
        500,
      );
    }
    const tmnCode = tmn || "DEMOV210";
    const hashSecret = secret || "demo_secret";
    const base = process.env.VNPAY_URL || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
    const txnRef = input.orderId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 32);
    // VNPay expects amount in VND * 100
    const vnpAmount = String(input.amountMinor * 100);
    const params: Record<string, string> = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode: tmnCode,
      vnp_Amount: vnpAmount,
      vnp_CurrCode: "VND",
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: `Order ${input.orderId}`,
      vnp_OrderType: "other",
      vnp_Locale: "vn",
      vnp_ReturnUrl: input.returnUrl || "http://localhost:3000/checkout/return",
      vnp_CreateDate: new Date()
        .toISOString()
        .replace(/[-:TZ.]/g, "")
        .slice(0, 14),
      vnp_IpAddr: "127.0.0.1",
    };
    const signData = Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join("&");
    const secureHash = createHmac("sha512", hashSecret).update(signData).digest("hex");
    const url = `${base}?${signData}&vnp_SecureHash=${secureHash}`;
    return {
      provider: this.name,
      providerRef: txnRef,
      clientAction: { type: "redirect", url },
    };
  }

  async verifyWebhook(_headers: Record<string, string | undefined>, body: string): Promise<VerifiedPaymentEvent> {
    const params = this.parseBody(body);
    const secret = process.env.VNPAY_HASH_SECRET || "demo_secret";
    const hash = params.vnp_SecureHash;
    if (!hash) throw new AppError(ErrorCodes.FORBIDDEN, "Missing VNPay hash", 401);
    const copy = { ...params };
    delete copy.vnp_SecureHash;
    delete copy.vnp_SecureHashType;
    const signData = Object.keys(copy)
      .sort()
      .map((k) => `${k}=${copy[k]}`)
      .join("&");
    const expected = createHmac("sha512", secret).update(signData).digest("hex");
    if (expected !== hash && process.env.VNPAY_HASH_SECRET) {
      throw new AppError(ErrorCodes.FORBIDDEN, "Invalid VNPay signature", 401);
    }
    const ok = params.vnp_ResponseCode === "00";
    // Convert VNPay amount (VND*100) back to amountMinor (VND)
    const amountMinor = Math.round(Number(params.vnp_Amount || 0) / 100);
    return {
      provider: this.name,
      providerEventId: `vnp_${params.vnp_TxnRef}_${params.vnp_TransactionNo || "0"}`,
      providerRef: params.vnp_TxnRef,
      status: ok ? "SUCCEEDED" : "FAILED",
      amountMinor,
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
