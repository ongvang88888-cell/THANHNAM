import { NextResponse } from "next/server";
import { getRadarService } from "@/server/radar";

export const runtime = "nodejs";

export async function GET() {
  const ads = await getRadarService().listAds();
  return NextResponse.json({ ads });
}
