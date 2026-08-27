import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { resolveDatabaseUrl } from "./prisma";

describe("resolveDatabaseUrl", () => {
  const previous = process.env.FMR_DATABASE_URL;
  const cwd = process.cwd();

  afterEach(() => {
    process.chdir(cwd);
    if (previous === undefined) {
      delete process.env.FMR_DATABASE_URL;
    } else {
      process.env.FMR_DATABASE_URL = previous;
    }
  });

  it("skips a 0-byte sqlite file and prefers prisma/dev.db", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "fmr-db-"));
    mkdirSync(path.join(dir, "prisma"));
    writeFileSync(path.join(dir, "dev.db"), "");
    writeFileSync(path.join(dir, "prisma", "dev.db"), "seed");
    process.chdir(dir);
    process.env.FMR_DATABASE_URL = "file:./dev.db";
    resolveDatabaseUrl();
    expect(process.env.FMR_DATABASE_URL).toBe(`file:${path.join(dir, "prisma", "dev.db")}`);
  });
});
