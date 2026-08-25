import { describe, expect, it } from "vitest";
import {
  assertChargeAmountMatches,
  assertFullRefundOnly,
  canFulfillOrder,
  canRefundOrder,
  isAlreadyFulfilled,
  isAlreadyRefunded,
  normalizeRefundAmount,
  stableProviderEventId,
} from "./money-stability";

describe("money stability", () => {
  it("builds collision-resistant store event ids", () => {
    const a = stableProviderEventId("gp_confirm", "token_aaaaaaaaaaaaaaaa");
    const b = stableProviderEventId("gp_confirm", "token_bbbbbbbbbbbbbbbb");
    expect(a).not.toEqual(b);
    expect(a).toMatch(/^gp_confirm_[a-f0-9]{40}$/);
    // same input ⇒ same id (idempotent confirms)
    expect(stableProviderEventId("gp_confirm", "token_aaaaaaaaaaaaaaaa")).toEqual(a);
  });

  it("normalizes refund amount 0/undefined to full", () => {
    expect(normalizeRefundAmount(undefined, 1000)).toBe(1000);
    expect(normalizeRefundAmount(0, 1000)).toBe(1000);
    expect(normalizeRefundAmount(1000, 1000)).toBe(1000);
  });

  it("rejects partial digital refunds", () => {
    expect(() => assertFullRefundOnly(500, 1000)).toThrow(/Partial refunds/);
    expect(() => assertFullRefundOnly(1000, 1000)).not.toThrow();
  });

  it("gates fulfill/refund by status", () => {
    expect(canFulfillOrder("AWAITING_PAYMENT")).toBe(true);
    expect(canFulfillOrder("FULFILLED")).toBe(false);
    expect(isAlreadyFulfilled("FULFILLED")).toBe(true);
    expect(canRefundOrder("FULFILLED")).toBe(true);
    expect(canRefundOrder("AWAITING_PAYMENT")).toBe(false);
    expect(isAlreadyRefunded("REFUNDED")).toBe(true);
  });

  it("checks charge amounts only when provider reports > 0", () => {
    expect(() => assertChargeAmountMatches(0, 1000)).not.toThrow();
    expect(() => assertChargeAmountMatches(1000, 1000)).not.toThrow();
    expect(() => assertChargeAmountMatches(999, 1000)).toThrow(/amount mismatch/);
  });
});
