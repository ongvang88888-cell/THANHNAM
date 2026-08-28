import { NextResponse } from "next/server";
import { getRadarService } from "@/server/radar";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const asOf = url.searchParams.get("asOf");
  const parsed = asOf ? Date.parse(asOf) : Date.now();
  const nowMs = Number.isFinite(parsed) ? parsed : Date.now();
  const batchRaw = url.searchParams.get("batch");
  const batch = batchRaw ? Number(batchRaw) : 20;
  const nextBatchSize = Number.isFinite(batch) ? Math.min(Math.max(Math.trunc(batch), 5), 50) : 20;
  const plan = await getRadarService().scanPlan(nowMs, nextBatchSize);
  return NextResponse.json({
    estimated: true,
    officialSearchOnly: true,
    plan,
  });
}
