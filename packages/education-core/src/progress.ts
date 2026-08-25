export function computeCoursePercent(
  totalLessons: number,
  completedLessons: number,
): number {
  if (totalLessons <= 0) return 0;
  return Math.min(10_000, Math.round((completedLessons / totalLessons) * 10_000));
}

export function isLessonComplete(input: {
  videoPositionMs: number;
  durationMs: number;
  threshold?: number;
  forcedComplete?: boolean;
}): boolean {
  if (input.forcedComplete) return true;
  if (input.durationMs <= 0) return false;
  const threshold = input.threshold ?? 0.9;
  return input.videoPositionMs / input.durationMs >= threshold;
}

export function makeCertificatePublicId(): string {
  const rand = crypto.getRandomValues(new Uint8Array(8));
  const hex = Array.from(rand, (b) => b.toString(16).padStart(2, "0")).join("");
  return `CERT-${hex.toUpperCase()}`;
}
