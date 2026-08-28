import { NextResponse } from "next/server";
import { UnauthorizedError } from "@/domain/authz";
import { allowRequest } from "@/server/rate-limit";
import { expectedCollectKey, getRadarService } from "@/server/radar";

export const runtime = "nodejs";

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ten = url.searchParams.get("ten")?.trim() ?? "";
  if (ten.length < 2) {
    return NextResponse.json({ error: "Nhập tên sản phẩm (từ 2 ký tự)" }, { status: 400 });
  }
  try {
    const lookup = await getRadarService().lookupScan(ten);
    return NextResponse.json(lookup);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không phân tích được" },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!allowRequest(`watch:${ip}`, Date.now())) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }
  try {
    const body: unknown = await request.json();
    const raw = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
    const name = readString(raw.name) ?? readString(raw.ten);
    if (!name) {
      return NextResponse.json({ error: "name / ten bắt buộc" }, { status: 400 });
    }
    const note = readString(raw.note) ?? null;
    const result = await getRadarService().upsertWatch(
      name,
      note,
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
      { error: error instanceof Error ? error.message : "Không lưu được tên sản phẩm" },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!allowRequest(`watch-del:${ip}`, Date.now())) {
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
    await getRadarService().deleteWatch(slug, request.headers.get("x-fmr-key"), expectedCollectKey());
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
