import { NextResponse } from "next/server";
import { UnauthorizedError } from "@/domain/authz";
import { allowRequest } from "@/server/rate-limit";
import { expectedCollectKey, getRadarService } from "@/server/radar";

export const runtime = "nodejs";

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export async function GET() {
  const service = getRadarService();
  const boards = await service.listBoards();
  const items = await service.listBoardItems();
  return NextResponse.json({ boards, items });
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!allowRequest(`board:${ip}`, Date.now())) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }
  try {
    const body: unknown = await request.json();
    const raw = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
    const name = readString(raw.name);
    if (!name) {
      return NextResponse.json({ error: "name bắt buộc" }, { status: 400 });
    }
    const board = await getRadarService().upsertBoard(
      name,
      readString(raw.note) ?? null,
      Date.now(),
      request.headers.get("x-fmr-key"),
      expectedCollectKey(),
    );
    return NextResponse.json({ board });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không tạo được bộ sưu tập" },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!allowRequest(`board-del:${ip}`, Date.now())) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }
  try {
    const url = new URL(request.url);
    let slug = url.searchParams.get("slug")?.trim() ?? "";
    if (!slug) {
      const body: unknown = await request.json().catch(() => null);
      const raw = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
      slug = readString(raw.slug) ?? "";
    }
    if (!slug) {
      return NextResponse.json({ error: "slug bắt buộc" }, { status: 400 });
    }
    await getRadarService().deleteBoard(slug, request.headers.get("x-fmr-key"), expectedCollectKey());
    return NextResponse.json({ ok: true, slug });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không xóa được" },
      { status: 400 },
    );
  }
}
