import { readFile } from "node:fs/promises";
import type { LicensedFeedReader } from "./licensed-provider";

export class FileLicensedFeedReader implements LicensedFeedReader {
  constructor(private readonly path: string | undefined) {}

  async read(): Promise<unknown> {
    if (!this.path) {
      return { ads: [] };
    }
    const text = await readFile(this.path, "utf8");
    return JSON.parse(text) as unknown;
  }
}
