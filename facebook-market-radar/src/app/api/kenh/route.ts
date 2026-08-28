import { NextResponse } from "next/server";
import { UnauthorizedError } from "@/domain/authz";
import { parsePlatformTab, serializePlatformTabs } from "@/domain/platform-dashboards";
import { allowRequest } from "@/server/rate-limit";
import { expectedCollectKey, getRadarService } from "@/server/radar";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tab = parsePlatformTab(url.searchParams.get("tab"));
  const niche = url.searchParams.get("niche") ?? undefined;
  const asOf = url.searchParams.get("asOf");
  const parsed = asOf ? Date.parse(asOf) : Date.now();
  const nowMs = Number.isFinite(parsed) ? parsed : Date.now();
  const dashboard = await getRadarService().listPlatformDashboard(nowMs, tab, niche);
  return NextResponse.json({
    estimated: true,
    autoCrawl: false,
    scope: "saved_warehouse",
    facebookNationalDump: false,
    nationalSalesDump: false,
    tabs: serializePlatformTabs(),
    dashboard,
  });
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!allowRequest(`kenh:${ip}`, Date.now())) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }
  try {
    const body: unknown = await request.json();
    if (typeof body !== "object" || body === null) {
      throw new Error("Body phải là JSON object");
    }
    const raw = body as Record<string, unknown>;
    const clusterSlug = typeof raw.clusterSlug === "string" ? raw.clusterSlug : "";
    const source = typeof raw.source === "string" ? raw.source : "";
    const value = typeof raw.value === "number" ? raw.value : Number(raw.value);
    if (!Number.isFinite(value)) {
      throw new Error("value phải là số");
    }
    const result = await getRadarService().recordChannelObservation(
      { clusterSlug, source, value },
      Date.now(),
      request.headers.get("x-fmr-key"),
      expectedCollectKey(),
    );
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không lưu được chỉ số" },
      { status: 400 },
    );
  }
}
