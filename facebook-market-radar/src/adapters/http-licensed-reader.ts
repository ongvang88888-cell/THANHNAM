import { assertLicensedFeedUrl } from "../domain/licensed-host";
import type { LicensedFeedReader } from "./licensed-provider";

const MAX_BYTES = 2_000_000;

export type LicensedHttp = (input: string, init: RequestInit) => Promise<Response>;

export class HttpLicensedFeedReader implements LicensedFeedReader {
  constructor(
    private readonly url: string | undefined,
    private readonly token: string | undefined,
    private readonly http: LicensedHttp = fetch,
  ) {}

  async read(): Promise<unknown> {
    const checked = assertLicensedFeedUrl(this.url);
    if (!checked.ok) {
      if (!this.url?.trim()) {
        return { ads: [] };
      }
      throw new Error(checked.error);
    }
    const headers: Record<string, string> = { Accept: "application/json" };
    const token = this.token?.trim();
    if (token) {
      headers.Authorization = token;
    }
    const response = await this.http(checked.href, {
      method: "GET",
      headers,
      redirect: "error",
      signal: AbortSignal.timeout(20_000),
    });
    const length = Number(response.headers.get("content-length") ?? "0");
    if (Number.isFinite(length) && length > MAX_BYTES) {
      throw new Error("Feed licensed vượt 2MB");
    }
    const text = await response.text();
    if (text.length > MAX_BYTES) {
      throw new Error("Feed licensed vượt 2MB");
    }
    if (!response.ok) {
      throw new Error(`Feed licensed HTTP ${response.status}`);
    }
    return JSON.parse(text) as unknown;
  }
}
