import { NextResponse } from "next/server";
import { FileLicensedFeedReader } from "@/adapters/file-licensed-reader";
import { HttpLicensedFeedReader } from "@/adapters/http-licensed-reader";
import { LicensedAdIndexProvider, JsonLicensedFeedReader } from "@/adapters/licensed-provider";
import { UnauthorizedError } from "@/domain/authz";
import { licensedPayloadLooksPresent } from "@/domain/licensed-feed";
import { allowRequest } from "@/server/rate-limit";
import { expectedCollectKey, getRadarService } from "@/server/radar";

export const runtime = "nodejs";

async function readBody(request: Request): Promise<unknown | null> {
  const text = await request.text();
  if (!text.trim()) {
    return null;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("Body licensed phải là JSON");
  }
}

export async function POST(request: Request) {
  if (!allowRequest("licensed", Date.now(), 5, 60_000)) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }
  try {
    const body = await readBody(request);
    const provider = licensedPayloadLooksPresent(body)
      ? new LicensedAdIndexProvider(new JsonLicensedFeedReader(JSON.stringify(body)))
      : process.env.FMR_LICENSED_FEED_URL?.trim()
        ? new LicensedAdIndexProvider(
            new HttpLicensedFeedReader(process.env.FMR_LICENSED_FEED_URL, process.env.FMR_LICENSED_FEED_TOKEN),
          )
        : new LicensedAdIndexProvider(new FileLicensedFeedReader(process.env.FMR_LICENSED_FEED_PATH));
    const mode = licensedPayloadLooksPresent(body)
      ? "json_body"
      : process.env.FMR_LICENSED_FEED_URL?.trim()
        ? "http"
        : "file";
    const ads = await provider.fetchAds({ nowMs: Date.now() });
    const result = await getRadarService().importNormalizedAds(
      ads,
      Date.now(),
      request.headers.get("x-fmr-key"),
      expectedCollectKey(),
    );
    return NextResponse.json({ ...result, source: "licensed", mode });
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
