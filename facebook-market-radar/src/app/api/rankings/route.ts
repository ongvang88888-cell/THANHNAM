import { NextResponse } from "next/server";
import { getRadarService } from "@/server/radar";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const niche = url.searchParams.get("niche") ?? undefined;
  const asOf = url.searchParams.get("asOf");
  const parsed = asOf ? Date.parse(asOf) : Date.now();
  const nowMs = Number.isFinite(parsed) ? parsed : Date.now();
  const rankings = await getRadarService().listRankings(nowMs, niche);
  return NextResponse.json({ estimated: true, rankings });
}
