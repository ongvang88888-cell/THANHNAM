import { PrismaClient } from "../generated/prisma";

const globalForPrisma = globalThis as { fmrPrisma?: PrismaClient };

export function getPrisma(): PrismaClient {
  if (!globalForPrisma.fmrPrisma) {
    globalForPrisma.fmrPrisma = new PrismaClient();
  }
  return globalForPrisma.fmrPrisma;
}
