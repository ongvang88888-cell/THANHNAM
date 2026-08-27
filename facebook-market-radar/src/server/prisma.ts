import { existsSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "../generated/prisma";

const globalForPrisma = globalThis as { fmrPrisma?: PrismaClient };

export function resolveDatabaseUrl(): void {
  const raw = process.env.FMR_DATABASE_URL ?? "file:./prisma/dev.db";
  if (!raw.startsWith("file:")) {
    return;
  }
  const rel = raw.slice("file:".length);
  const candidates = [
    path.resolve(process.cwd(), rel),
    path.resolve(process.cwd(), "prisma/dev.db"),
    path.resolve(process.cwd(), "dev.db"),
  ];
  const found = candidates.find((candidate) => existsSync(candidate));
  process.env.FMR_DATABASE_URL = `file:${found ?? path.resolve(process.cwd(), "prisma/dev.db")}`;
}

export function getPrisma(): PrismaClient {
  if (!globalForPrisma.fmrPrisma) {
    resolveDatabaseUrl();
    globalForPrisma.fmrPrisma = new PrismaClient();
  }
  return globalForPrisma.fmrPrisma;
}
