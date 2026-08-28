import { NextResponse } from "next/server";
import { UnauthorizedError } from "@/domain/authz";
import { allowRequest } from "@/server/rate-limit";
import { expectedCollectKey, getRadarService } from "@/server/radar";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!allowRequest(`collect-sheet:${ip}`, Date.now(), 5, 60_000)) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }
  try {
    const body: unknown = await request.json();
    const raw = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
    const csv = typeof raw.csv === "string" ? raw.csv : "";
    const result = await getRadarService().collectSheet(
      csv,
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
      { error: error instanceof Error ? error.message : "Không nhập được sheet" },
      { status: 400 },
    );
  }
}
