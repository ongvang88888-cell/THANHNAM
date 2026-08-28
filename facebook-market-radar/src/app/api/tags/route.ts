import { NextResponse } from "next/server";
import { UnauthorizedError } from "@/domain/authz";
import { allowRequest } from "@/server/rate-limit";
import { expectedCollectKey, getRadarService } from "@/server/radar";

export const runtime = "nodejs";

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export async function GET() {
  const tags = await getRadarService().listAdTags();
  return NextResponse.json({ tags });
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!allowRequest(`tags:${ip}`, Date.now())) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }
  try {
    const body: unknown = await request.json();
    const raw = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
    const libraryId = readString(raw.libraryId);
    if (!libraryId) {
      return NextResponse.json({ error: "libraryId bắt buộc" }, { status: 400 });
    }
    const tags = Array.isArray(raw.tags)
      ? raw.tags.filter((item): item is string => typeof item === "string")
      : [];
    const saved = await getRadarService().replaceAdTags(
      libraryId,
      tags,
      request.headers.get("x-fmr-key"),
      expectedCollectKey(),
    );
    return NextResponse.json({ libraryId, tags: saved });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không gắn được nhãn" },
      { status: 400 },
    );
  }
}
