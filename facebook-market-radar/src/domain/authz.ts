export class UnauthorizedError extends Error {
  readonly code = "UNAUTHORIZED";
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/** Optional shared secret for collect / sync mutations. Empty expected = open local MVP. */
export function assertCollectAuthorized(
  provided: string | null | undefined,
  expected: string | undefined,
): void {
  if (!expected || expected.length === 0) {
    return;
  }
  if (!provided || provided !== expected) {
    throw new UnauthorizedError("Unauthorized: sai hoặc thiếu x-fmr-key");
  }
}

/**
 * Cron (x-fmr-cron) or collect key. Empty expected cron+collect = open local MVP.
 * Systemd timer uses cron; the homepage “Cập nhật ngay” button uses collect.
 */
export function assertCronAuthorized(
  cronProvided: string | null | undefined,
  collectProvided: string | null | undefined,
  expectedCron: string | undefined,
  expectedCollect: string | undefined,
): void {
  const cron = expectedCron?.trim() ?? "";
  const collect = expectedCollect?.trim() ?? "";
  if (!cron && !collect) {
    return;
  }
  if (cron && cronProvided === cron) {
    return;
  }
  if (collect && collectProvided === collect) {
    return;
  }
  throw new UnauthorizedError("Unauthorized: sai hoặc thiếu x-fmr-cron / x-fmr-key");
}
