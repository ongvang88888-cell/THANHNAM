import { NextResponse } from "next/server";
import { getRadarService } from "@/server/radar";

export const runtime = "nodejs";

export async function GET() {
  const alerts = await getRadarService().listAlerts();
  return NextResponse.json({ alerts });
}
