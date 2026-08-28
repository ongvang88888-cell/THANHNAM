const hits = new Map<string, number[]>();

export function allowRequest(
  bucket: string,
  nowMs: number,
  max = 30,
  windowMs = 60_000,
): boolean {
  const recent = (hits.get(bucket) ?? []).filter((t) => nowMs - t < windowMs);
  if (recent.length >= max) {
    hits.set(bucket, recent);
    return false;
  }
  recent.push(nowMs);
  hits.set(bucket, recent);
  return true;
}
