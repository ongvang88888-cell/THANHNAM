import { NextResponse } from "next/server";
import { DATA_SOURCES, SOURCE_FAMILY_VI } from "@/domain/data-sources";
import { serializeSalesChannels } from "@/domain/sales-channels";
import { getRadarService } from "@/server/radar";

export const runtime = "nodejs";

export async function GET() {
  const warehouse = await getRadarService().warehouseStats();
  return NextResponse.json({
    warehouse,
    ingest: {
      licensedFile: Boolean(process.env.FMR_LICENSED_FEED_PATH?.trim()),
      licensedHttp: Boolean(process.env.FMR_LICENSED_FEED_URL?.trim()),
      marketingToken: Boolean(process.env.META_ACCESS_TOKEN?.trim()),
    },
    families: SOURCE_FAMILY_VI,
    sources: DATA_SOURCES,
    salesChannels: serializeSalesChannels(),
  });
}
