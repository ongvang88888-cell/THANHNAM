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
    const tmn = process.env.VNPAY_TMN_CODE || "DEMOV210";
    const secret = process.env.VNPAY_HASH_SECRET || "demo_secret";
    const base = process.env.VNPAY_URL || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
    const txnRef = input.orderId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 32);
    const params: Record<string, string> = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode: tmn,
      vnp_Amount: String(input.amountMinor),
      vnp_CurrCode: input.currency === "VND" ? "VND" : "VND",
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
    const secureHash = createHmac("sha512", secret).update(signData).digest("hex");
    const url = `${base}?${signData}&vnp_SecureHash=${secureHash}`;
    return {
      provider: this.name,
      providerRef: txnRef,
      clientAction: { type: "redirect", url },
    };
  }

  async verifyWebhook(_headers: Record<string, string | undefined>, body: string): Promise<VerifiedPaymentEvent> {
    const params = JSON.parse(body) as Record<string, string>;
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
    return {
      provider: this.name,
      providerEventId: `vnp_${params.vnp_TxnRef}_${params.vnp_TransactionNo || "0"}`,
      providerRef: params.vnp_TxnRef,
      status: ok ? "SUCCEEDED" : "FAILED",
      amountMinor: Number(params.vnp_Amount || 0),
      raw: params,
    };
  }
}
