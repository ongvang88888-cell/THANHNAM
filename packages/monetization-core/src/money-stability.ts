import { createHash } from "node:crypto";

/** Order statuses that may still accept a successful payment fulfill. */
export const FULFILLABLE_ORDER_STATUSES = ["AWAITING_PAYMENT"] as const;

/** Order statuses that may accept a refund. */
export const REFUNDABLE_ORDER_STATUSES = ["PAID", "FULFILLED", "REFUND_PENDING"] as const;

export type MoneyOrderStatus =
  | "DRAFT"
  | "AWAITING_PAYMENT"
  | "PAID"
  | "FULFILLED"
  | "FAILED"
  | "REFUND_PENDING"
  | "REFUNDED"
  | "CANCELLED"
  | string;

/**
 * Stable, collision-resistant provider event id for store confirms.
 * Never truncate raw tokens — different tokens can share a short prefix.
 */
export function stableProviderEventId(prefix: string, token: string): string {
  const hash = createHash("sha256").update(`${prefix}:${token}`).digest("hex").slice(0, 40);
  return `${prefix}_${hash}`;
}

/** Normalize refund amount: missing/0 ⇒ full payment amount. */
export function normalizeRefundAmount(
  requested: number | undefined,
  paymentAmountMinor: number,
): number {
  if (requested == null || requested <= 0) return paymentAmountMinor;
  return requested;
}

/**
 * Digital entitlements: only full refunds are safe.
 * Partial refund + full revoke (or partial revoke) creates inconsistent access.
 */
export function assertFullRefundOnly(
  amountMinor: number,
  paymentAmountMinor: number,
): void {
  if (amountMinor !== paymentAmountMinor) {
    throw new Error(
      `Partial refunds are not supported for digital entitlements (requested ${amountMinor}, payment ${paymentAmountMinor})`,
    );
  }
}

export function isAlreadyFulfilled(status: MoneyOrderStatus): boolean {
  return status === "FULFILLED" || status === "PAID";
}

export function isAlreadyRefunded(status: MoneyOrderStatus): boolean {
  return status === "REFUNDED";
}

export function canFulfillOrder(status: MoneyOrderStatus): boolean {
  return (FULFILLABLE_ORDER_STATUSES as readonly string[]).includes(status);
}

export function canRefundOrder(status: MoneyOrderStatus): boolean {
  return (REFUNDABLE_ORDER_STATUSES as readonly string[]).includes(status);
}

/**
 * Payment charge events must match catalog amount when provider reports a positive amount.
 * Store confirms often echo our amount; webhooks may send 0 ⇒ skip strict check.
 */
export function assertChargeAmountMatches(
  eventAmountMinor: number,
  paymentAmountMinor: number,
): void {
  if (eventAmountMinor > 0 && eventAmountMinor !== paymentAmountMinor) {
    throw new Error(
      `Payment amount mismatch: expected ${paymentAmountMinor}, got ${eventAmountMinor}`,
    );
  }
}
