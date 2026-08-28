import { NextResponse } from "next/server";
import { assertCollectAuthorized, UnauthorizedError } from "@/domain/authz";
import { PLATFORM_KEY_GUIDES, platformSecretFlags } from "@/domain/platform-secrets";
import { allowRequest } from "@/server/rate-limit";
import { resolvedPlatformSecrets, savePlatformSecretsPatch } from "@/server/platform-secrets-store";
import { expectedCollectKey, expectedCronKey, getRadarService } from "@/server/radar";

export const runtime = "nodejs";

function publicStatus() {
  const flags = platformSecretFlags(resolvedPlatformSecrets());
  return {
    configured: flags,
    enabled: flags,
    guides: PLATFORM_KEY_GUIDES,
    browserLoginIsNotApiKey: true,
    competitorSold: false,
    marketSoldFromApi: false,
    scrapeMarketplaceHtml: false,
    ownShopEntersHeat: false,
  };
}

export async function GET() {
  return NextResponse.json(publicStatus());
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!allowRequest(`platform-keys:${ip}`, Date.now(), 6, 60_000)) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }
  try {
    assertCollectAuthorized(request.headers.get("x-fmr-key"), expectedCollectKey());
    const body: unknown = await request.json().catch(() => ({}));
    savePlatformSecretsPatch(body);
    const flags = platformSecretFlags(resolvedPlatformSecrets());
    const any =
      flags.youtube || flags.googleCse || flags.shopeeShop || flags.lazadaShop || flags.tiktokShop;
    if (any) {
      try {
        await getRadarService().refreshPlatformStats(
          "all",
          Date.now(),
          request.headers.get("x-fmr-key"),
          expectedCollectKey(),
        );
        await getRadarService().refreshSummaryCycle(
          Date.now(),
          request.headers.get("x-fmr-cron"),
          request.headers.get("x-fmr-key"),
          expectedCronKey(),
          expectedCollectKey(),
        );
      } catch {
        /* keys saved even if API fill fails */
      }
    }
    return NextResponse.json({
      ...publicStatus(),
      saved: true,
      filledFromBrowserSession: false,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không lưu được khóa" },
      { status: 400 },
    );
  }
}
