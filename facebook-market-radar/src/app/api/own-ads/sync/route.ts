import { NextResponse } from "next/server";
import {
  FixtureMarketingHttp,
  FIXTURE_GRAPH_INSIGHTS,
  GraphMarketingHttp,
  OwnAdsMarketingApiProvider,
} from "@/adapters/marketing-api-provider";
import { UnauthorizedError } from "@/domain/authz";
import { allowRequest } from "@/server/rate-limit";
import { expectedCollectKey, getRadarService } from "@/server/radar";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!allowRequest("own-sync", Date.now(), 10, 60_000)) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }
  const token = process.env.META_ACCESS_TOKEN;
  const accountId = process.env.META_AD_ACCOUNT_ID ?? "act_demo";
  const provider = token
    ? new OwnAdsMarketingApiProvider(token, new GraphMarketingHttp())
    : new OwnAdsMarketingApiProvider("fixture", new FixtureMarketingHttp(FIXTURE_GRAPH_INSIGHTS));
  const until = new Date().toISOString().slice(0, 10);
  const sinceDate = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
  try {
    const imported = await getRadarService().syncOwnInsights(
      provider,
      accountId,
      sinceDate,
      until,
      request.headers.get("x-fmr-key"),
      expectedCollectKey(),
    );
    return NextResponse.json({ imported, source: token ? "marketing_api" : "fixture" });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync thất bại" },
      { status: 400 },
    );
  }
}
