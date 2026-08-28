import { NextResponse } from "next/server";
import { getRadarService } from "@/server/radar";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? url.searchParams.get("ten") ?? "").trim();
  if (query.length < 2) {
    return NextResponse.json({ error: "Nhập tên hoặc từ khóa (từ 2 ký tự)" }, { status: 400 });
  }
  try {
    const lookup = await getRadarService().lookupScan(query);
    return NextResponse.json({ estimated: true, officialSearchOnly: true, ...lookup });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không tìm được" },
      { status: 400 },
    );
  }
}
