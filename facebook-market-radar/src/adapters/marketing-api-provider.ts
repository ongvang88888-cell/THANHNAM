import {
  mapGraphInsight,
  redactToken,
  type GraphInsightRow,
} from "../domain/own-insights";
import type { IOwnAdsInsightsProvider, OwnCampaignInsight } from "../domain/ports";

export interface MarketingHttp {
  getJson(url: string, accessToken: string): Promise<unknown>;
}

export class FixtureMarketingHttp implements MarketingHttp {
  constructor(private readonly rows: GraphInsightRow[]) {}

  async getJson(_url: string, _accessToken: string): Promise<unknown> {
    return { data: this.rows };
  }
}

export class GraphMarketingHttp implements MarketingHttp {
  constructor(private readonly fetchFn: typeof fetch = fetch) {}

  async getJson(url: string, accessToken: string): Promise<unknown> {
    const response = await this.fetchFn(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(redactToken(`Marketing API ${response.status}: ${text.slice(0, 200)}`));
    }
    return JSON.parse(text) as unknown;
  }
}

const GRAPH_VERSION = "v21.0";

export class OwnAdsMarketingApiProvider implements IOwnAdsInsightsProvider {
  readonly source = "own_ads" as const;

  constructor(
    private readonly accessToken: string,
    private readonly http: MarketingHttp,
  ) {}

  async fetchInsights(input: {
    adAccountId: string;
    since: string;
    until: string;
  }): Promise<OwnCampaignInsight[]> {
    if (!/^[0-9A-Za-z_]+$/.test(input.adAccountId)) {
      throw new Error("adAccountId không hợp lệ");
    }
    const account = input.adAccountId.startsWith("act_")
      ? input.adAccountId
      : `act_${input.adAccountId}`;
    const params = new URLSearchParams({
      fields: "campaign_id,campaign_name,date_start,spend,impressions,actions,action_values",
      time_range: JSON.stringify({ since: input.since, until: input.until }),
      level: "campaign",
      time_increment: "1",
    });
    const url = `https://graph.facebook.com/${GRAPH_VERSION}/${account}/insights?${params.toString()}`;
    const payload = await this.http.getJson(url, this.accessToken);
    if (typeof payload !== "object" || payload === null || !("data" in payload)) {
      throw new Error("Marketing API trả về payload không hợp lệ");
    }
    const data = (payload as { data: unknown }).data;
    if (!Array.isArray(data)) {
      throw new Error("Marketing API data phải là mảng");
    }
    const rows: OwnCampaignInsight[] = [];
    for (const item of data) {
      const mapped = mapGraphInsight(account, item as GraphInsightRow);
      if (mapped) {
        rows.push(mapped);
      }
    }
    return rows;
  }
}

export const FIXTURE_GRAPH_INSIGHTS: GraphInsightRow[] = [
  {
    campaign_id: "own_c_prospect",
    campaign_name: "VN — Prospecting catalog",
    date_start: "2026-08-20",
    spend: "1.50",
    impressions: "2400",
    actions: [{ action_type: "purchase", value: "2" }],
    action_values: [{ action_type: "purchase", value: "18.00" }],
  },
  {
    campaign_id: "own_c_retarget",
    campaign_name: "VN — Retarget viewers",
    date_start: "2026-08-21",
    spend: "0.80",
    impressions: "900",
    actions: [{ action_type: "purchase", value: "1" }],
    action_values: [{ action_type: "purchase", value: "9.50" }],
  },
];
