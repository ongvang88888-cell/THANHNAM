import { NextResponse } from "next/server";
import { parseChannelSort, serializeSalesChannels } from "@/domain/sales-channels";
import { getRadarService } from "@/server/radar";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const niche = url.searchParams.get("niche") ?? undefined;
  const sort = parseChannelSort(url.searchParams.get("xep") ?? undefined);
  const asOf = url.searchParams.get("asOf");
  const parsed = asOf ? Date.parse(asOf) : Date.now();
  const nowMs = Number.isFinite(parsed) ? parsed : Date.now();
  const products = await getRadarService().listChannelAnalysis(nowMs, sort, niche);
  return NextResponse.json({
    estimated: true,
    scope: "saved_warehouse",
    facebookNationalDump: false,
    nationalSalesDump: false,
    sort,
    channels: serializeSalesChannels(),
    products,
  });
}
