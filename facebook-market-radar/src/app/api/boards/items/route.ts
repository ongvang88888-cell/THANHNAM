import { NextResponse } from "next/server";
import { UnauthorizedError } from "@/domain/authz";
import { allowRequest } from "@/server/rate-limit";
import { expectedCollectKey, getRadarService } from "@/server/radar";

export const runtime = "nodejs";

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug")?.trim();
  const items = await getRadarService().listBoardItems(slug || undefined);
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!allowRequest(`board-item:${ip}`, Date.now())) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }
  try {
    const body: unknown = await request.json();
    const raw = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
    const boardSlug = readString(raw.boardSlug);
    const libraryId = readString(raw.libraryId);
    if (!boardSlug || !libraryId) {
      return NextResponse.json({ error: "boardSlug và libraryId bắt buộc" }, { status: 400 });
    }
    const item = await getRadarService().addBoardItem(
      boardSlug,
      libraryId,
      Date.now(),
      request.headers.get("x-fmr-key"),
      expectedCollectKey(),
    );
    return NextResponse.json({ item });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không ghim được thẻ" },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!allowRequest(`board-item-del:${ip}`, Date.now())) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }
  try {
    const url = new URL(request.url);
    let boardSlug = url.searchParams.get("boardSlug")?.trim() ?? "";
    let libraryId = url.searchParams.get("libraryId")?.trim() ?? "";
    if (!boardSlug || !libraryId) {
      const body: unknown = await request.json().catch(() => null);
      const raw = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
      boardSlug = boardSlug || readString(raw.boardSlug) || "";
      libraryId = libraryId || readString(raw.libraryId) || "";
    }
    if (!boardSlug || !libraryId) {
      return NextResponse.json({ error: "boardSlug và libraryId bắt buộc" }, { status: 400 });
    }
    await getRadarService().removeBoardItem(
      boardSlug,
      libraryId,
      request.headers.get("x-fmr-key"),
      expectedCollectKey(),
    );
    return NextResponse.json({ ok: true, boardSlug, libraryId });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không gỡ được thẻ" },
      { status: 400 },
    );
  }
}
