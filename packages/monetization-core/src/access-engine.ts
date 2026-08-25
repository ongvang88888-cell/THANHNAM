export type AccessDecisionCode =
  | "CAN_ACCESS"
  | "CANNOT_ACCESS"
  | "NEEDS_PURCHASE"
  | "NEEDS_AD"
  | "NEEDS_PREREQUISITE"
  | "EXPIRED";

export type AccessDecision =
  | { code: "CAN_ACCESS"; reasons: string[]; expiresAt?: string }
  | { code: "CANNOT_ACCESS"; reasons: string[] }
  | { code: "NEEDS_PURCHASE"; reasons: string[]; productIds: string[] }
  | { code: "NEEDS_AD"; reasons: string[]; rewardPolicyId: string }
  | { code: "NEEDS_PREREQUISITE"; reasons: string[]; lessonIds: string[] }
  | { code: "EXPIRED"; reasons: string[]; expiredAt: string };

export type PolicyType =
  | "FREE"
  | "PREVIEW"
  | "PURCHASE_REQUIRED"
  | "SUBSCRIPTION_REQUIRED"
  | "BUNDLE_REQUIRED"
  | "REWARDED_AD"
  | "PREREQUISITE_REQUIRED"
  | "TIME_LOCKED"
  | "ADMIN_GRANTED";

export interface AccessPolicyInput {
  policyType: PolicyType;
  priority: number;
  params: Record<string, unknown>;
}

export interface EntitlementInput {
  resourceType: string;
  resourceId: string;
  source: string;
  status: "ACTIVE" | "EXPIRED" | "REVOKED";
  expiresAt?: Date | null;
}

export interface AccessEvaluationContext {
  now: Date;
  isStaffBypass?: boolean;
  isAuthenticated: boolean;
  policies: AccessPolicyInput[];
  entitlements: EntitlementInput[];
  completedLessonIds?: string[];
  resourceType: string;
  resourceId: string;
  parentResourceIds?: Array<{ resourceType: string; resourceId: string }>;
}

function isActiveEntitlement(e: EntitlementInput, now: Date): boolean {
  if (e.status !== "ACTIVE") return false;
  if (e.expiresAt && e.expiresAt.getTime() <= now.getTime()) return false;
  return true;
}

function hasEntitlementFor(
  entitlements: EntitlementInput[],
  resourceType: string,
  resourceId: string,
  now: Date,
): EntitlementInput | undefined {
  return entitlements.find(
    (e) =>
      e.resourceType === resourceType &&
      e.resourceId === resourceId &&
      isActiveEntitlement(e, now),
  );
}

function hasAnyMatchingEntitlement(
  ctx: AccessEvaluationContext,
  productIds: string[],
): boolean {
  for (const productId of productIds) {
    if (hasEntitlementFor(ctx.entitlements, "product", productId, ctx.now)) {
      return true;
    }
    if (hasEntitlementFor(ctx.entitlements, "course", productId, ctx.now)) {
      return true;
    }
    if (hasEntitlementFor(ctx.entitlements, "document", productId, ctx.now)) {
      return true;
    }
  }
  for (const parent of ctx.parentResourceIds ?? []) {
    if (hasEntitlementFor(ctx.entitlements, parent.resourceType, parent.resourceId, ctx.now)) {
      return true;
    }
  }
  // Direct lesson entitlement (reward unlock)
  if (
    hasEntitlementFor(ctx.entitlements, ctx.resourceType, ctx.resourceId, ctx.now)
  ) {
    return true;
  }
  return false;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

/**
 * Pure Access Policy Engine — server authority for content access.
 * Never trust client premium flags.
 */
export function evaluateAccess(ctx: AccessEvaluationContext): AccessDecision {
  if (ctx.isStaffBypass) {
    return { code: "CAN_ACCESS", reasons: ["staff_bypass"] };
  }

  const policies = [...ctx.policies].sort((a, b) => a.priority - b.priority);

  // Direct active entitlement on resource always wins
  const direct = hasEntitlementFor(
    ctx.entitlements,
    ctx.resourceType,
    ctx.resourceId,
    ctx.now,
  );
  if (direct) {
    return {
      code: "CAN_ACCESS",
      reasons: [`entitlement:${direct.source}`],
      expiresAt: direct.expiresAt?.toISOString(),
    };
  }

  // Check expired entitlement specifically on resource
  const expired = ctx.entitlements.find(
    (e) =>
      e.resourceType === ctx.resourceType &&
      e.resourceId === ctx.resourceId &&
      (e.status === "EXPIRED" ||
        (e.status === "ACTIVE" && e.expiresAt && e.expiresAt.getTime() <= ctx.now.getTime())),
  );
  let sawExpired = Boolean(expired);

  let needsPurchase: AccessDecision | null = null;
  let needsAd: AccessDecision | null = null;
  let needsPrerequisite: AccessDecision | null = null;

  for (const policy of policies) {
    switch (policy.policyType) {
      case "FREE":
      case "PREVIEW": {
        if (policy.policyType === "FREE" || ctx.isAuthenticated) {
          return { code: "CAN_ACCESS", reasons: [policy.policyType.toLowerCase()] };
        }
        break;
      }
      case "ADMIN_GRANTED": {
        // only via entitlement — already checked
        break;
      }
      case "PURCHASE_REQUIRED":
      case "BUNDLE_REQUIRED":
      case "SUBSCRIPTION_REQUIRED": {
        const productId =
          typeof policy.params.productId === "string" ? policy.params.productId : undefined;
        const productIds = productId
          ? [productId, ...asStringArray(policy.params.productIds)]
          : asStringArray(policy.params.productIds);
        if (hasAnyMatchingEntitlement(ctx, productIds)) {
          return { code: "CAN_ACCESS", reasons: [policy.policyType.toLowerCase()] };
        }
        if (!needsPurchase) {
          needsPurchase = {
            code: "NEEDS_PURCHASE",
            reasons: [policy.policyType.toLowerCase()],
            productIds,
          };
        }
        break;
      }
      case "REWARDED_AD": {
        if (hasAnyMatchingEntitlement(ctx, [])) {
          // direct entitlement already handled
        }
        const rewardPolicyId =
          typeof policy.params.policyCode === "string"
            ? policy.params.policyCode
            : typeof policy.params.rewardPolicyId === "string"
              ? policy.params.rewardPolicyId
              : "default";
        // If user has lesson entitlement from reward, covered above
        if (!needsAd) {
          needsAd = {
            code: "NEEDS_AD",
            reasons: ["rewarded_ad"],
            rewardPolicyId,
          };
        }
        break;
      }
      case "PREREQUISITE_REQUIRED": {
        const lessonIds = asStringArray(policy.params.lessonIds);
        const completed = new Set(ctx.completedLessonIds ?? []);
        const missing = lessonIds.filter((id) => !completed.has(id));
        if (missing.length === 0 && lessonIds.length > 0) {
          // prerequisites met — continue; do not alone grant access
          break;
        }
        if (missing.length > 0) {
          needsPrerequisite = {
            code: "NEEDS_PREREQUISITE",
            reasons: ["prerequisite_required"],
            lessonIds: missing,
          };
        }
        break;
      }
      case "TIME_LOCKED": {
        const unlockAtRaw = policy.params.unlockAt;
        const unlockAt =
          typeof unlockAtRaw === "string" || typeof unlockAtRaw === "number"
            ? new Date(unlockAtRaw)
            : null;
        if (unlockAt && unlockAt.getTime() > ctx.now.getTime()) {
          return {
            code: "CANNOT_ACCESS",
            reasons: [`time_locked_until:${unlockAt.toISOString()}`],
          };
        }
        break;
      }
      default: {
        const _exhaustive: never = policy.policyType;
        void _exhaustive;
        break;
      }
    }
  }

  if (needsPrerequisite) return needsPrerequisite;
  // Prefer purchase CTA if both purchase and ad are options — UI can still show Watch Ad
  // Spec: return NEEDS_AD when rewarded is available and no purchase entitlement.
  // Return NEEDS_PURCHASE when purchase required and no ad policy, else prefer showing both via purchase first with ad as alternate in reasons.
  if (needsPurchase && needsAd) {
    return {
      ...needsPurchase,
      reasons: [...needsPurchase.reasons, "alt:rewarded_ad", `rewardPolicy:${needsAd.rewardPolicyId}`],
    };
  }
  if (needsPurchase) return needsPurchase;
  if (needsAd) return needsAd;
  if (sawExpired && expired?.expiresAt) {
    return {
      code: "EXPIRED",
      reasons: ["entitlement_expired"],
      expiredAt: expired.expiresAt.toISOString(),
    };
  }

  return { code: "CANNOT_ACCESS", reasons: ["no_matching_policy"] };
}

export function canAccess(decision: AccessDecision): boolean {
  return decision.code === "CAN_ACCESS";
}
