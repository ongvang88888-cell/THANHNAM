const DAY_MS = 86_400_000;

/** Monday 00:00 UTC of the ISO week containing `nowMs`. */
export function weekStartUtc(nowMs: number): Date {
  const date = new Date(nowMs);
  const utc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const day = new Date(utc).getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return new Date(utc + mondayOffset * DAY_MS);
}

export function isoWeekLabel(nowMs: number): string {
  const start = weekStartUtc(nowMs);
  const thursday = new Date(start.getTime() + 3 * DAY_MS);
  const year = thursday.getUTCFullYear();
  const jan4 = Date.UTC(year, 0, 4);
  const jan4WeekStart = weekStartUtc(jan4).getTime();
  const week = Math.floor((start.getTime() - jan4WeekStart) / (7 * DAY_MS)) + 1;
  return `${year}-W${String(week).padStart(2, "0")}`;
}

export function parseIsoWeekLabel(label: string): Date | null {
  const match = /^(\d{4})-W(\d{2})$/.exec(label);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const week = Number(match[2]);
  if (!Number.isInteger(year) || !Number.isInteger(week) || week < 1 || week > 53) {
    return null;
  }
  const jan4 = Date.UTC(year, 0, 4);
  const start = weekStartUtc(jan4);
  return new Date(start.getTime() + (week - 1) * 7 * DAY_MS);
}
