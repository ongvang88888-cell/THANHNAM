import { NextResponse } from "next/server";
import { UnauthorizedError } from "@/domain/authz";
import { allowRequest } from "@/server/rate-limit";
import { expectedCollectKey, expectedCronKey, getRadarService } from "@/server/radar";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!allowRequest(`summary-refresh:${ip}`, Date.now(), 2, 60_000)) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }
  try {
    const snapshot = await getRadarService().refreshSummaryCycle(
      Date.now(),
      request.headers.get("x-fmr-cron"),
      request.headers.get("x-fmr-key"),
      expectedCronKey(),
      expectedCollectKey(),
    );
    return NextResponse.json({
      capturedAt: snapshot.capturedAt,
      nextDueAt: snapshot.nextDueAt,
      rowCount: snapshot.rowCount,
      filledCells: snapshot.filledCells,
      emptyCells: snapshot.emptyCells,
      apiRan: snapshot.apiRan,
      estimated: true,
      facebookNationalDump: false,
      nationalSalesDump: false,
      marketSoldFromApi: false,
      scrapeMarketplaceHtml: false,
      autoCrawl: false,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không ghi được bảng tổng hợp" },
      { status: 400 },
    );
  }
}
