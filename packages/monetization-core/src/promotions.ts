/** Pure helpers for coupons + affiliate commission (no I/O). */

export type CouponLike = {
  enabled: boolean;
  percentOff?: number | null;
  amountOffMinor?: number | null;
  currency?: string;
  maxRedemptions?: number | null;
  startsAt?: Date | string | null;
  endsAt?: Date | string | null;
};

export function computeCouponDiscountMinor(
  coupon: CouponLike,
  amountMinor: number,
  now: Date = new Date(),
): number {
  if (!coupon.enabled || amountMinor <= 0) return 0;
  if (coupon.startsAt && new Date(coupon.startsAt) > now) return 0;
  if (coupon.endsAt && new Date(coupon.endsAt) < now) return 0;

  if (coupon.percentOff != null && coupon.percentOff > 0) {
    const pct = Math.min(100, Math.max(0, coupon.percentOff));
    return Math.min(amountMinor, Math.floor((amountMinor * pct) / 100));
  }
  if (coupon.amountOffMinor != null && coupon.amountOffMinor > 0) {
    return Math.min(amountMinor, coupon.amountOffMinor);
  }
  return 0;
}

export function assertCouponRedeemable(
  coupon: CouponLike & { redemptionCount?: number },
  orderCurrency: string,
  now: Date = new Date(),
): void {
  if (!coupon.enabled) throw new Error("Coupon is disabled");
  if (coupon.currency && coupon.currency !== orderCurrency) {
    throw new Error(`Coupon currency mismatch: ${coupon.currency} vs ${orderCurrency}`);
  }
  if (coupon.startsAt && new Date(coupon.startsAt) > now) {
    throw new Error("Coupon not started yet");
  }
  if (coupon.endsAt && new Date(coupon.endsAt) < now) {
    throw new Error("Coupon expired");
  }
  if (
    coupon.maxRedemptions != null &&
    coupon.redemptionCount != null &&
    coupon.redemptionCount >= coupon.maxRedemptions
  ) {
    throw new Error("Coupon max redemptions reached");
  }
}

/** Commission in minor units from basis points (10000 = 100%). */
export function computeAffiliateCommissionMinor(orderTotalMinor: number, commissionBps: number): number {
  if (orderTotalMinor <= 0 || commissionBps <= 0) return 0;
  return Math.floor((orderTotalMinor * commissionBps) / 10_000);
}
