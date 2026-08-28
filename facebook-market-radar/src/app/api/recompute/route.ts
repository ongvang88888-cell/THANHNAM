import { NextResponse } from "next/server";
import { UnauthorizedError } from "@/domain/authz";
import { expectedCollectKey, getRadarService } from "@/server/radar";
import { assertCollectAuthorized } from "@/domain/authz";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertCollectAuthorized(request.headers.get("x-fmr-key"), expectedCollectKey());
    await getRadarService().recompute(Date.now());
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Recompute thất bại" },
      { status: 400 },
    );
  }
}
