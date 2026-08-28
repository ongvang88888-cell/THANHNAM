import { PrismaRadarRepository } from "../adapters/prisma-repository";
import { RadarService, DEFAULT_APP_ID } from "../application/radar-service";
import { getPrisma } from "./prisma";

export function getRadarService(): RadarService {
  return new RadarService(new PrismaRadarRepository(getPrisma()), process.env.FMR_APP_ID ?? DEFAULT_APP_ID);
}

export function collectKeyFromRequest(header: string | null): string | null {
  return header;
}

export function expectedCollectKey(): string | undefined {
  return process.env.FMR_COLLECT_KEY;
}
