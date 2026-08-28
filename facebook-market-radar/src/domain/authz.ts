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
