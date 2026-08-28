import { PrismaRadarRepository } from "../adapters/prisma-repository";
import { YoutubeDataApiProvider } from "../adapters/youtube-data-api";
import { RadarService, DEFAULT_APP_ID } from "../application/radar-service";
import { getPrisma } from "./prisma";

export function getRadarService(): RadarService {
  return new RadarService(
    new PrismaRadarRepository(getPrisma()),
    process.env.FMR_APP_ID ?? DEFAULT_APP_ID,
    new YoutubeDataApiProvider(process.env.YOUTUBE_API_KEY),
  );
}

export function collectKeyFromRequest(header: string | null): string | null {
  return header;
}

export function expectedCollectKey(): string | undefined {
  return process.env.FMR_COLLECT_KEY;
}
