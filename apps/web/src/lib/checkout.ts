import { apiPost } from "./api";

export type CheckoutProvider = "mock" | "stripe" | "vnpay" | "momo" | "zalopay";

export type CheckoutResult = {
  order: { id: string; status: string };
  fulfilled?: boolean;
  intent?: {
    clientAction?: {
      type?: string;
      clientSecret?: string;
      url?: string;
    };
  };
};

export type CheckoutOutcome =
  | { kind: "redirect"; url: string; orderId: string }
  | { kind: "stripe"; orderId: string; clientSecret: string }
  | { kind: "done"; orderId: string };

export async function startCheckout(input: {
  productId: string;
  token: string;
  provider: CheckoutProvider;
  couponCode?: string;
  affiliateCode?: string;
}): Promise<CheckoutOutcome> {
  const returnUrl = `${window.location.origin}/checkout/return`;
  const visitorKey = localStorage.getItem("edu_visitor_key") || undefined;
  const res = await apiPost<CheckoutResult>(
    "/checkout/sessions",
    {
      productId: input.productId,
      idempotencyKey: `web-${input.productId}-${Date.now()}`,
      provider: input.provider,
      platform: "web",
      returnUrl: `${returnUrl}?orderId=PENDING`,
      ...(input.couponCode?.trim() ? { couponCode: input.couponCode.trim() } : {}),
      ...(input.affiliateCode?.trim() ? { affiliateCode: input.affiliateCode.trim() } : {}),
      ...(visitorKey ? { visitorKey } : {}),
    },
    input.token,
  );

  const action = res.intent?.clientAction;
  if (
    (input.provider === "vnpay" || input.provider === "momo" || input.provider === "zalopay") &&
    action?.type === "redirect" &&
    action.url
  ) {
    const url = action.url.includes("orderId=")
      ? action.url
      : `${action.url}${action.url.includes("?") ? "&" : "?"}orderId=${res.order.id}`;
    return { kind: "redirect", url, orderId: res.order.id };
  }

  if (input.provider === "stripe") {
    return { kind: "stripe", orderId: res.order.id, clientSecret: action?.clientSecret ?? "" };
  }

  return { kind: "done", orderId: res.order.id };
}

export function followCheckout(
  outcome: CheckoutOutcome,
  navigate: (href: string) => void,
): void {
  if (outcome.kind === "redirect") {
    window.location.href = outcome.url;
    return;
  }
  if (outcome.kind === "stripe") {
    navigate(
      `/checkout/pay?orderId=${encodeURIComponent(outcome.orderId)}&clientSecret=${encodeURIComponent(outcome.clientSecret)}`,
    );
    return;
  }
  navigate(`/checkout/return?orderId=${encodeURIComponent(outcome.orderId)}`);
}
