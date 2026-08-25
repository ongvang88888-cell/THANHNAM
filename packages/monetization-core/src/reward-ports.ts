export interface RewardEligibilityInput {
  userId: string;
  resourceType: string;
  resourceId: string;
  dailyCount: number;
  dailyLimit: number;
  lastGrantedAt?: Date | null;
  cooldownMinutes: number;
  now: Date;
  rewardedEnabled: boolean;
}

export interface RewardEligibilityResult {
  eligible: boolean;
  reason?: string;
}

export function evaluateRewardEligibility(
  input: RewardEligibilityInput,
): RewardEligibilityResult {
  if (!input.rewardedEnabled) {
    return { eligible: false, reason: "rewarded_disabled" };
  }
  if (input.dailyCount >= input.dailyLimit) {
    return { eligible: false, reason: "daily_limit" };
  }
  if (input.lastGrantedAt && input.cooldownMinutes > 0) {
    const unlockAt =
      input.lastGrantedAt.getTime() + input.cooldownMinutes * 60_000;
    if (input.now.getTime() < unlockAt) {
      return { eligible: false, reason: "cooldown" };
    }
  }
  return { eligible: true };
}

export interface AdsRewardPort {
  verifySsv(query: Record<string, string>): Promise<{
    valid: boolean;
    transactionId: string;
    userId?: string;
    customData?: string;
  }>;
}
