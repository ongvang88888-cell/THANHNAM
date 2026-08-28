import { createHmac } from "node:crypto";
import type { IOwnShopStatsProvider, OwnShopItemStat } from "../domain/ports";
import { assertOfficialStatsUrl } from "../domain/official-stats-host";
import { parseShopeeItemIds, parseShopeeItemNames, parseShopeeOwnItems } from "../domain/own-shop";

const HOST = "https://partner.shopeemobile.com";

export type ShopeeOpenCreds = {
  partnerId?: string;
  partnerKey?: string;
  shopId?: string;
  accessToken?: string;
};

export type ShopHttp = (input: string, init: RequestInit) => Promise<Response>;

function sign(path: string, timestamp: number, creds: Required<ShopeeOpenCreds>): string {
  const base = `${creds.partnerId}${path}${timestamp}${creds.accessToken}${creds.shopId}`;
  return createHmac("sha256", creds.partnerKey).update(base).digest("hex");
}

export class ShopeeOpenApiProvider implements IOwnShopStatsProvider {
  readonly platform = "shopee" as const;

  constructor(
    private readonly creds: ShopeeOpenCreds,
    private readonly http: ShopHttp = fetch,
    private readonly nowSec: () => number = () => Math.floor(Date.now() / 1000),
  ) {}

  get enabled(): boolean {
    return Boolean(
      this.creds.partnerId?.trim() &&
        this.creds.partnerKey?.trim() &&
        this.creds.shopId?.trim() &&
        this.creds.accessToken?.trim(),
    );
  }

  private required(): Required<ShopeeOpenCreds> {
    const partnerId = this.creds.partnerId?.trim() ?? "";
    const partnerKey = this.creds.partnerKey?.trim() ?? "";
    const shopId = this.creds.shopId?.trim() ?? "";
    const accessToken = this.creds.accessToken?.trim() ?? "";
    if (!partnerId || !partnerKey || !shopId || !accessToken) {
      throw new Error("Chưa cấu hình Shopee Open (partner/shop/token) — chỉ shop của bạn, không phải đối thủ");
    }
    return { partnerId, partnerKey, shopId, accessToken };
  }

  private async get(path: string, extra: Record<string, string>): Promise<unknown> {
    const creds = this.required();
    const timestamp = this.nowSec();
    const url = new URL(`${HOST}${path}`);
    url.searchParams.set("partner_id", creds.partnerId);
    url.searchParams.set("timestamp", String(timestamp));
    url.searchParams.set("access_token", creds.accessToken);
    url.searchParams.set("shop_id", creds.shopId);
    url.searchParams.set("sign", sign(path, timestamp, creds));
    for (const [key, value] of Object.entries(extra)) {
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
      throw new Error("Shopee Open API không trả item shop của bạn");
    }
    return response.json();
  }

  async fetchOwnItems(): Promise<OwnShopItemStat[]> {
    const creds = this.required();
    const list = await this.get("/api/v2/product/get_item_list", {
      offset: "0",
      page_size: "50",
      item_status: "NORMAL",
    });
    const ids = parseShopeeItemIds(list).slice(0, 50);
    if (ids.length === 0) {
      return [];
    }
    const joined = ids.join(",");
    const [base, extra] = await Promise.all([
      this.get("/api/v2/product/get_item_base_info", { item_id_list: joined }),
      this.get("/api/v2/product/get_item_extra_info", { item_id_list: joined }),
    ]);
    return parseShopeeOwnItems(extra, creds.shopId, parseShopeeItemNames(base));
  }
}
