import { NextResponse } from "next/server";
import { DATA_SOURCES, SOURCE_FAMILY_VI } from "@/domain/data-sources";
import { OFFICIAL_PLATFORM_APIS } from "@/domain/official-platform-apis";
import { serializeSalesChannels } from "@/domain/sales-channels";
import { platformSecretFlags } from "@/domain/platform-secrets";
import { resolvedPlatformSecrets } from "@/server/platform-secrets-store";
import { getRadarService } from "@/server/radar";

export const runtime = "nodejs";

export async function GET() {
  const warehouse = await getRadarService().warehouseStats();
  const apiFlags = platformSecretFlags(resolvedPlatformSecrets());
  return NextResponse.json({
    warehouse,
    ingest: {
      licensedFile: Boolean(process.env.FMR_LICENSED_FEED_PATH?.trim()),
      licensedHttp: Boolean(process.env.FMR_LICENSED_FEED_URL?.trim()),
      marketingToken: Boolean(process.env.META_ACCESS_TOKEN?.trim()),
      youtube: apiFlags.youtube,
      googleCse: apiFlags.googleCse,
    },
    families: SOURCE_FAMILY_VI,
    sources: DATA_SOURCES,
    officialApis: OFFICIAL_PLATFORM_APIS,
    salesChannels: serializeSalesChannels(),
  });
}
