import { NextResponse } from "next/server";
import { STRONG_FIND_METHODS, STRONG_HEAT, STRONG_LONGEVITY, strongProductReason } from "@/domain/strong-ads";
import { getRadarService } from "@/server/radar";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const niche = url.searchParams.get("niche") ?? undefined;
  const asOf = url.searchParams.get("asOf");
  const parsed = asOf ? Date.parse(asOf) : Date.now();
  const nowMs = Number.isFinite(parsed) ? parsed : Date.now();
  const products = await getRadarService().listStrongProducts(nowMs, niche);
  return NextResponse.json({
    estimated: true,
    scope: "saved_warehouse",
    facebookNationalDump: false,
    threshold: { heat: STRONG_HEAT, longevity: STRONG_LONGEVITY, minActiveAdsForLongevity: 2 },
    methods: STRONG_FIND_METHODS.map((method) => method.id),
    products: products.map((row) => ({
      ...row,
      reason: strongProductReason(row),
    })),
  });
}
