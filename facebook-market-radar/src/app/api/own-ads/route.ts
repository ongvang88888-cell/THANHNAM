import { NextResponse } from "next/server";
import { getRadarService } from "@/server/radar";

export const runtime = "nodejs";

export async function GET() {
  const summary = await getRadarService().ownInsightsSummary();
  return NextResponse.json(summary);
}
