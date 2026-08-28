import type { OwnCampaignInsight } from "./ports";

export type OwnInsightsTotals = {
  spendMinor: number;
  impressions: number;
  purchases: number;
  purchaseValueMinor: number | null;
  roas: number | null;
  estimated: false;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseOwnInsightRow(payload: unknown): OwnCampaignInsight | null {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return null;
  }
  const raw = payload as Record<string, unknown>;
  const adAccountId = asId(raw.adAccountId);
  const campaignId = asId(raw.campaignId);
  const campaignName = typeof raw.campaignName === "string" ? raw.campaignName.trim() : "";
  const date = typeof raw.date === "string" ? raw.date.slice(0, 10) : "";
  const spendMinor = asInt(raw.spendMinor);
  const impressions = asInt(raw.impressions);
  const purchases = asInt(raw.purchases);
  if (!adAccountId || !campaignId || !campaignName || !ISO_DATE.test(date)) {
    return null;
  }
  if (spendMinor === null || impressions === null || purchases === null) {
    return null;
  }
  const purchaseValueMinor =
    raw.purchaseValueMinor === null || raw.purchaseValueMinor === undefined
      ? null
      : asInt(raw.purchaseValueMinor);
  if (raw.purchaseValueMinor !== undefined && raw.purchaseValueMinor !== null && purchaseValueMinor === null) {
    return null;
  }
  return {
    adAccountId,
    campaignId,
    campaignName,
    date,
    spendMinor,
    impressions,
    purchases,
    purchaseValueMinor,
  };
}

function asId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return /^[0-9A-Za-z._-]{1,64}$/.test(trimmed) ? trimmed : null;
}

function asInt(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    return null;
  }
  return value;
}

export function summarizeOwnInsights(rows: OwnCampaignInsight[]): OwnInsightsTotals {
  let spendMinor = 0;
  let impressions = 0;
  let purchases = 0;
  let purchaseValueMinor = 0;
  let hasValue = false;
  for (const row of rows) {
    spendMinor += row.spendMinor;
    impressions += row.impressions;
    purchases += row.purchases;
    if (row.purchaseValueMinor !== null) {
      purchaseValueMinor += row.purchaseValueMinor;
      hasValue = true;
    }
  }
  const roas =
    hasValue && spendMinor > 0 ? Math.round((purchaseValueMinor / spendMinor) * 100) / 100 : null;
  return {
    spendMinor,
    impressions,
    purchases,
    purchaseValueMinor: hasValue ? purchaseValueMinor : null,
    roas,
    estimated: false,
  };
}

export type GraphInsightAction = { action_type: string; value: string };

export type GraphInsightRow = {
  campaign_id?: string;
  campaign_name?: string;
  date_start?: string;
  spend?: string;
  impressions?: string;
  actions?: GraphInsightAction[];
  action_values?: GraphInsightAction[];
};

/** Map Marketing API insight row. Spend from Graph is major units (string). */
export function mapGraphInsight(
  adAccountId: string,
  row: GraphInsightRow,
): OwnCampaignInsight | null {
  const campaignId = row.campaign_id ?? "";
  const campaignName = row.campaign_name ?? "";
  const date = row.date_start ?? "";
  const spendMajor = Number(row.spend ?? "0");
  const impressions = Number(row.impressions ?? "0");
  if (!campaignId || !campaignName || !ISO_DATE.test(date.slice(0, 10))) {
    return null;
  }
  if (!Number.isFinite(spendMajor) || spendMajor < 0 || !Number.isFinite(impressions)) {
    return null;
  }
  const purchases = sumAction(row.actions, "purchase");
  const purchaseValue = sumAction(row.action_values, "purchase");
  return parseOwnInsightRow({
    adAccountId,
    campaignId,
    campaignName,
    date: date.slice(0, 10),
    spendMinor: Math.round(spendMajor * 100),
    impressions: Math.round(impressions),
    purchases,
    purchaseValueMinor: purchaseValue === null ? null : Math.round(purchaseValue * 100),
  });
}

function sumAction(actions: GraphInsightAction[] | undefined, type: string): number | null {
  if (!actions) {
    return type === "purchase" ? 0 : null;
  }
  const hit = actions.find((a) => a.action_type === type);
  if (!hit) {
    return type === "purchase" ? 0 : null;
  }
  const n = Number(hit.value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function redactToken(detail: string): string {
  return detail.replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]");
}
