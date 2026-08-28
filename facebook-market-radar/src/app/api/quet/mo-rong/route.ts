import { NextResponse } from "next/server";
import { isLockedNiche } from "@/domain/niches";
import { getRadarService } from "@/server/radar";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const offsetRaw = Number(url.searchParams.get("offset") ?? "0");
  const limitRaw = Number(url.searchParams.get("limit") ?? "40");
  const offset = Number.isFinite(offsetRaw) ? offsetRaw : 0;
  const limit = Number.isFinite(limitRaw) ? limitRaw : 40;
  const niche = url.searchParams.get("niche")?.trim() ?? "";
  const q = url.searchParams.get("q")?.trim() ?? url.searchParams.get("ten")?.trim() ?? "";
  if (niche && !isLockedNiche(niche)) {
    return NextResponse.json({ error: "Ngành không hợp lệ" }, { status: 400 });
  }
  const page = getRadarService().pageMegaScan({
    offset,
    limit,
    nicheSlug: niche || undefined,
    q: q || undefined,
  });
  return NextResponse.json({
    estimated: true,
    ...page,
  });
}
