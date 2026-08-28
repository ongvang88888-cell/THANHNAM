import { createHmac } from "node:crypto";
import type { IOwnShopStatsProvider, OwnShopItemStat } from "../domain/ports";
import { assertOfficialStatsUrl } from "../domain/official-stats-host";
import { parseTiktokShopOwnItems } from "../domain/own-shop";

const HOST = "https://open-api.tiktokglobalshop.com";
const PATH = "/product/202309/products/search";

export type TiktokShopCreds = {
  appKey?: string;
  appSecret?: string;
  accessToken?: string;
  shopId?: string;
};

export type ShopHttp = (input: string, init: RequestInit) => Promise<Response>;

function tiktokSign(secret: string, path: string, params: Record<string, string>): string {
  const keys = Object.keys(params)
    .filter((key) => key !== "sign" && key !== "access_token")
    .sort();
  let base = secret + path;
  for (const key of keys) {
    base += key + (params[key] ?? "");
  }
  base += secret;
  return createHmac("sha256", secret).update(base).digest("hex");
}

export class TiktokShopApiProvider implements IOwnShopStatsProvider {
  readonly platform = "tiktok" as const;

  constructor(
    private readonly creds: TiktokShopCreds,
    private readonly http: ShopHttp = fetch,
    private readonly nowSec: () => number = () => Math.floor(Date.now() / 1000),
  ) {}

  get enabled(): boolean {
    return Boolean(
      this.creds.appKey?.trim() &&
        this.creds.appSecret?.trim() &&
        this.creds.accessToken?.trim() &&
        this.creds.shopId?.trim(),
    );
  }

  async fetchOwnItems(): Promise<OwnShopItemStat[]> {
    const appKey = this.creds.appKey?.trim() ?? "";
    const appSecret = this.creds.appSecret?.trim() ?? "";
    const accessToken = this.creds.accessToken?.trim() ?? "";
    const shopId = this.creds.shopId?.trim() ?? "";
    if (!appKey || !appSecret || !accessToken || !shopId) {
      throw new Error("Chưa cấu hình TikTok Shop Open — chỉ shop của bạn, không scrape tiktok.com");
    }
    const params: Record<string, string> = {
      app_key: appKey,
      timestamp: String(this.nowSec()),
      shop_id: shopId,
      shop_cipher: shopId,
    };
    params.sign = tiktokSign(appSecret, PATH, params);
    const url = new URL(`${HOST}${PATH}`);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    url.searchParams.set("access_token", accessToken);
    const checked = assertOfficialStatsUrl(url.toString());
    if (!checked.ok) {
      throw new Error(checked.error);
    }
    const response = await this.http(checked.href, {
      method: "POST",
      redirect: "error",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page_size: 20 }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
      throw new Error("TikTok Shop Open API không trả sản phẩm shop của bạn");
    }
    return parseTiktokShopOwnItems(await response.json(), shopId);
  }
}
