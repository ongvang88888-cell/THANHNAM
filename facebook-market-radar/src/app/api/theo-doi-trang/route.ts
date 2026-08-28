import { NextResponse } from "next/server";
import { UnauthorizedError } from "@/domain/authz";
import { allowRequest } from "@/server/rate-limit";
import { expectedCollectKey, getRadarService } from "@/server/radar";

export const runtime = "nodejs";

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export async function GET() {
  const watches = await getRadarService().listPageWatches();
  return NextResponse.json({ watches });
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!allowRequest(`page-watch:${ip}`, Date.now())) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }
  try {
    const body: unknown = await request.json();
    const raw = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
    const pageId = readString(raw.pageId);
    if (!pageId) {
      return NextResponse.json({ error: "pageId bắt buộc" }, { status: 400 });
    }
    const watch = await getRadarService().upsertPageWatch(
      pageId,
      readString(raw.pageName) ?? null,
      readString(raw.note) ?? null,
      Date.now(),
      request.headers.get("x-fmr-key"),
      expectedCollectKey(),
    );
    return NextResponse.json({ watch });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không theo dõi được trang" },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!allowRequest(`page-watch-del:${ip}`, Date.now())) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }
  try {
    const url = new URL(request.url);
    let pageId = url.searchParams.get("pageId")?.trim() ?? "";
    if (!pageId) {
      const body: unknown = await request.json().catch(() => null);
      const raw = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
      pageId = readString(raw.pageId) ?? "";
    }
    if (!pageId) {
      return NextResponse.json({ error: "pageId bắt buộc" }, { status: 400 });
    }
    await getRadarService().deletePageWatch(pageId, request.headers.get("x-fmr-key"), expectedCollectKey());
    return NextResponse.json({ ok: true, pageId });
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
