import { NextResponse } from "next/server";
import { FileLicensedFeedReader } from "@/adapters/file-licensed-reader";
import { LicensedAdIndexProvider } from "@/adapters/licensed-provider";
import { UnauthorizedError } from "@/domain/authz";
import { allowRequest } from "@/server/rate-limit";
import { expectedCollectKey, getRadarService } from "@/server/radar";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!allowRequest("licensed", Date.now(), 5, 60_000)) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }
  const provider = new LicensedAdIndexProvider(
    new FileLicensedFeedReader(process.env.FMR_LICENSED_FEED_PATH),
  );
  const nowMs = Date.now();
  try {
    const ads = await provider.fetchAds({ nowMs });
    const service = getRadarService();
    const key = request.headers.get("x-fmr-key");
    const expected = expectedCollectKey();
    let imported = 0;
    for (const ad of ads) {
      await service.collectManual(
        {
          snapshot: ad,
          productTitle: ad.productHint ?? ad.title ?? ad.pageName,
          nicheSlug: ad.nicheHint ?? undefined,
        },
        nowMs,
        key,
        expected,
      );
      imported += 1;
    }
    return NextResponse.json({ imported, source: "licensed" });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import thất bại" },
      { status: 400 },
    );
  }
}
