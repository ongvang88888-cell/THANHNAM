export interface FulfillmentItem {
  orderItemId: string;
  productId: string;
  productType: string;
  childProductIds?: string[];
}

export interface EntitlementGrantSpec {
  resourceType: string;
  resourceId: string;
  source: "PURCHASE" | "BUNDLE" | "SUBSCRIPTION" | "REWARD" | "COUPON" | "ADMIN" | "PROMOTION";
  sourceRef: string;
  expiresAt?: Date | null;
}

/**
 * Expand order items into entitlement grant specs (idempotent by sourceRef).
 */
export function buildEntitlementGrants(items: FulfillmentItem[]): EntitlementGrantSpec[] {
  const grants: EntitlementGrantSpec[] = [];
  for (const item of items) {
    const isBundle =
      item.productType === "COURSE_BUNDLE" ||
      item.productType === "DOCUMENT_BUNDLE" ||
      item.productType === "MIXED_BUNDLE";

    if (isBundle) {
      grants.push({
        resourceType: "bundle",
        resourceId: item.productId,
        source: "BUNDLE",
        sourceRef: item.orderItemId,
      });
      for (const childId of item.childProductIds ?? []) {
        grants.push({
          resourceType: "product",
          resourceId: childId,
          source: "BUNDLE",
          sourceRef: item.orderItemId,
        });
      }
      continue;
    }

    if (item.productType === "SUBSCRIPTION" || item.productType === "PREMIUM_LIBRARY") {
      grants.push({
        resourceType: "subscription",
        resourceId: item.productId,
        source: "SUBSCRIPTION",
        sourceRef: item.orderItemId,
      });
      continue;
    }

    grants.push({
      resourceType: "product",
      resourceId: item.productId,
      source: "PURCHASE",
      sourceRef: item.orderItemId,
    });
  }
  return grants;
}
