import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "../generated/prisma";

const globalForPrisma = globalThis as { fmrPrisma?: PrismaClient };

function usableSqliteFile(candidate: string): boolean {
  if (!existsSync(candidate)) {
    return false;
  }
  try {
    return statSync(candidate).size > 0;
  } catch {
    return false;
  }
}

export function resolveDatabaseUrl(): void {
  const preferred = path.resolve(process.cwd(), "prisma/dev.db");
  const raw = process.env.FMR_DATABASE_URL ?? "file:./prisma/dev.db";
  if (!raw.startsWith("file:")) {
    return;
  }
  const rel = raw.slice("file:".length);
  const candidates = [
    path.resolve(process.cwd(), rel),
    preferred,
    path.resolve(process.cwd(), "dev.db"),
  ];
  const found = candidates.find(usableSqliteFile);
  process.env.FMR_DATABASE_URL = `file:${found ?? preferred}`;
}

export function getPrisma(): PrismaClient {
  if (!globalForPrisma.fmrPrisma) {
    resolveDatabaseUrl();
    globalForPrisma.fmrPrisma = new PrismaClient();
  }
  return globalForPrisma.fmrPrisma;
}
