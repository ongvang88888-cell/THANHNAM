import { NextResponse } from "next/server";
import { UnauthorizedError } from "@/domain/authz";
import { OFFICIAL_PLATFORM_APIS } from "@/domain/official-platform-apis";
import { parsePlatformStatsAction } from "@/application/radar-service";
import { allowRequest } from "@/server/rate-limit";
import { expectedCollectKey, getRadarService } from "@/server/radar";

export const runtime = "nodejs";

export async function GET() {
  const service = getRadarService();
  return NextResponse.json({
    enabled: service.platformStatsCapabilities(),
    apis: OFFICIAL_PLATFORM_APIS,
    competitorSold: false,
    marketSoldFromApi: false,
    viewsEnterHeat: false,
    scrapeMarketplaceHtml: false,
  });
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!allowRequest(`platform-stats:${ip}`, Date.now(), 3, 60_000)) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }
  try {
    const body: unknown = await request.json().catch(() => ({}));
    const action = parsePlatformStatsAction(
      typeof body === "object" && body !== null && "action" in body ? (body as { action: unknown }).action : "all",
    );
    const result = await getRadarService().refreshPlatformStats(
      action,
      Date.now(),
      request.headers.get("x-fmr-key"),
      expectedCollectKey(),
    );
    return NextResponse.json({
      ...result,
      autoCrawl: false,
      scrapeMarketplaceHtml: false,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không lấy được thống kê API" },
      { status: 400 },
    );
  }
}
