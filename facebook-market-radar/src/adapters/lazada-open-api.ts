import { createHmac } from "node:crypto";
import type { IOwnShopStatsProvider, OwnShopItemStat } from "../domain/ports";
import { assertOfficialStatsUrl } from "../domain/official-stats-host";
import { parseLazadaOwnItems } from "../domain/own-shop";

const HOST = "https://api.lazada.vn/rest";
const PATH = "/products/get";

export type LazadaOpenCreds = {
  appKey?: string;
  appSecret?: string;
  accessToken?: string;
  sellerId?: string;
};

export type ShopHttp = (input: string, init: RequestInit) => Promise<Response>;

function lazadaSign(secret: string, apiPath: string, params: Record<string, string>): string {
  const keys = Object.keys(params).sort();
  let base = secret + apiPath;
  for (const key of keys) {
    base += key + (params[key] ?? "");
  }
  base += secret;
  return createHmac("sha256", secret).update(base).digest("hex").toUpperCase();
}

export class LazadaOpenApiProvider implements IOwnShopStatsProvider {
  readonly platform = "lazada" as const;

  constructor(
    private readonly creds: LazadaOpenCreds,
    private readonly http: ShopHttp = fetch,
    private readonly nowMs: () => number = () => Date.now(),
  ) {}

  get enabled(): boolean {
    return Boolean(this.creds.appKey?.trim() && this.creds.appSecret?.trim() && this.creds.accessToken?.trim());
  }

  async fetchOwnItems(): Promise<OwnShopItemStat[]> {
    const appKey = this.creds.appKey?.trim() ?? "";
    const appSecret = this.creds.appSecret?.trim() ?? "";
    const accessToken = this.creds.accessToken?.trim() ?? "";
    if (!appKey || !appSecret || !accessToken) {
      throw new Error("Chưa cấu hình Lazada Open (app key/secret/token) — chỉ shop của bạn");
    }
    const params: Record<string, string> = {
      app_key: appKey,
      timestamp: String(this.nowMs()),
      access_token: accessToken,
      sign_method: "sha256",
      filter: "all",
    };
    params.sign = lazadaSign(appSecret, PATH, params);
    const url = new URL(`${HOST}${PATH}`);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    const checked = assertOfficialStatsUrl(url.toString());
    if (!checked.ok) {
      throw new Error(checked.error);
    }
    const response = await this.http(checked.href, {
      method: "GET",
      redirect: "error",
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
      throw new Error("Lazada Open API không trả catalog shop của bạn");
    }
    const shopId = this.creds.sellerId?.trim() || "own";
    return parseLazadaOwnItems(await response.json(), shopId);
  }
}
