import { NextResponse } from "next/server";
import { UnauthorizedError } from "@/domain/authz";
import type { CollectManualInput } from "@/domain/collect-input";
import { allowRequest } from "@/server/rate-limit";
import { expectedCollectKey, getRadarService } from "@/server/radar";

export const runtime = "nodejs";

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function readCollectInput(body: unknown): CollectManualInput {
  if (typeof body !== "object" || body === null) {
    throw new Error("Body phải là JSON object");
  }
  const raw = body as Record<string, unknown>;
  const platforms = Array.isArray(raw.platforms)
    ? raw.platforms.filter((item): item is string => typeof item === "string")
    : undefined;
  return {
    sourceUrl: readString(raw.sourceUrl),
    snapshot: raw.snapshot,
    libraryId: readString(raw.libraryId),
    pageId: readString(raw.pageId),
    pageName: readString(raw.pageName),
    body: readString(raw.body),
    title: readString(raw.title),
    startDate: readString(raw.startDate),
    isActive: readBoolean(raw.isActive),
    platforms,
    landingUrl: readString(raw.landingUrl),
    productTitle: readString(raw.productTitle),
    nicheSlug: readString(raw.nicheSlug),
    shopeeSold: readNumber(raw.shopeeSold),
    tiktokSold: readNumber(raw.tiktokSold),
    imageUrl: readString(raw.imageUrl),
    listingPriceVnd: readString(raw.listingPriceVnd) ?? readNumber(raw.listingPriceVnd),
  };
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!allowRequest(`collect:${ip}`, Date.now())) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }
  try {
    const body: unknown = await request.json();
    const input = readCollectInput(body);
    const result = await getRadarService().collectManual(
      input,
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
      { error: error instanceof Error ? error.message : "Không lưu được" },
      { status: 400 },
    );
  }
}
