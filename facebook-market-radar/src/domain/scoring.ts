import {
  DEFAULT_HEAT_WEIGHTS,
  type ClusterSignals,
  type HeatWeights,
  type ScoreBreakdown,
} from "./ports";

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function logScale(count: number, fullAt: number): number {
  if (count <= 0 || fullAt <= 1) {
    return 0;
  }
  const ratio = Math.log10(count + 1) / Math.log10(fullAt + 1);
  return clamp(ratio * 100, 0, 100);
}

export function scoreIntensity(signals: ClusterSignals): number {
  const ads = logScale(signals.activeAdCount, 50);
  const pages = logScale(signals.distinctPageCount, 10);
  const variants = logScale(signals.creativeVariantCount, 20);
  return round1(0.45 * ads + 0.35 * pages + 0.2 * variants);
}

export function scoreLongevity(signals: ClusterSignals): number {
  if (signals.adsAgeDays.length === 0) {
    return 0;
  }
  const points = signals.adsAgeDays.map((days) => {
    if (days >= 60) return 100;
    if (days >= 30) return 75;
    if (days >= 14) return 50;
    if (days >= 7) return 25;
    return 10;
  });
  const avg = points.reduce((sum, n) => sum + n, 0) / points.length;
  return round1(avg);
}

export function scoreVelocity(signals: ClusterSignals): number {
  return round1(clamp((signals.newAdsLast7Days / 10) * 100, 0, 100));
}

export function scoreSalesProxy(sold: number | null): number {
  if (sold === null || sold < 0) {
    return 0;
  }
  return round1(logScale(sold, 10_000));
}

export function scoreHeat(
  signals: ClusterSignals,
  weights: HeatWeights = DEFAULT_HEAT_WEIGHTS,
): ScoreBreakdown {
  const intensity = scoreIntensity(signals);
  const longevity = scoreLongevity(signals);
  const velocity = scoreVelocity(signals);
  const salesProxy = scoreSalesProxy(signals.salesProxySold);
  const weightSum =
    weights.intensity + weights.longevity + weights.velocity + weights.salesProxy;
  if (weightSum <= 0) {
    return { intensity, longevity, velocity, salesProxy, heat: 0, estimated: true };
  }
  const heat = round1(
    (weights.intensity * intensity +
      weights.longevity * longevity +
      weights.velocity * velocity +
      weights.salesProxy * salesProxy) /
      weightSum,
  );
  return { intensity, longevity, velocity, salesProxy, heat, estimated: true };
}

export function adAgeDays(startDateIso: string, nowMs: number): number {
  const start = Date.parse(startDateIso);
  if (!Number.isFinite(start) || start > nowMs) {
    return 0;
  }
  return Math.floor((nowMs - start) / 86_400_000);
}

export function isNewInLastDays(startDateIso: string, nowMs: number, days: number): boolean {
  return adAgeDays(startDateIso, nowMs) < days;
}
