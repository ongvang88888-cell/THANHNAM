import { NextResponse } from "next/server";
import { SUMMARY_INTERVAL_MS } from "@/domain/summary-table";
import { getRadarService } from "@/server/radar";

export const runtime = "nodejs";

export async function GET() {
  const status = await getRadarService().getSummaryStatus(Date.now());
  return NextResponse.json({
    ...status,
    intervalMs: SUMMARY_INTERVAL_MS,
    autoCrawl: false,
    scrapeMarketplaceHtml: false,
  });
}
