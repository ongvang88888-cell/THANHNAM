import { NextResponse } from "next/server";
import { isLockedNiche } from "@/domain/niches";
import { parsePlatformTab, serializePlatformTabs } from "@/domain/platform-dashboards";
import { parseTopPage } from "@/domain/platform-bestsellers";
import { getRadarService } from "@/server/radar";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tab = parsePlatformTab(url.searchParams.get("tab"));
  const nicheRaw = url.searchParams.get("niche")?.trim() ?? "";
  if (nicheRaw && !isLockedNiche(nicheRaw)) {
    return NextResponse.json({ error: "Ngành không hợp lệ" }, { status: 400 });
  }
  const q = url.searchParams.get("q")?.trim() ?? url.searchParams.get("ten")?.trim() ?? "";
  const trang = parseTopPage(url.searchParams.get("trang"));
  const asOf = url.searchParams.get("asOf");
  const parsed = asOf ? Date.parse(asOf) : Date.now();
  const nowMs = Number.isFinite(parsed) ? parsed : Date.now();
  const page = await getRadarService().listPlatformBestsellers(nowMs, tab, {
    niche: nicheRaw || undefined,
    q: q || undefined,
    trang,
  });
  return NextResponse.json({
    estimated: true,
    autoCrawl: false,
    scope: "research_catalog_plus_warehouse_overlay",
    facebookNationalDump: false,
    nationalSalesDump: false,
    nationalDump: false,
    tabs: serializePlatformTabs(),
    page,
  });
}
