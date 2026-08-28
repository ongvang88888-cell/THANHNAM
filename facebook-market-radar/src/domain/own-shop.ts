export const OWN_SHOP_PLATFORMS = ["shopee", "lazada", "tiktok"] as const;
export type OwnShopPlatform = (typeof OWN_SHOP_PLATFORMS)[number];

export type OwnShopItem = {
  platform: OwnShopPlatform;
  shopId: string;
  itemId: string;
  itemName: string;
  soldCount: number;
};

export function isOwnShopPlatform(value: string): value is OwnShopPlatform {
  return (OWN_SHOP_PLATFORMS as readonly string[]).includes(value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function readString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return "";
}

function readSold(...values: unknown[]): number {
  for (const value of values) {
    const n = typeof value === "string" ? Number(value) : typeof value === "number" ? value : NaN;
    if (Number.isInteger(n) && n >= 0 && n <= 50_000_000) {
      return n;
    }
  }
  return 0;
}

function pushItem(out: OwnShopItem[], item: OwnShopItem, seen: Set<string>): void {
  if (!item.itemId || !item.shopId) {
    return;
  }
  const key = `${item.platform}:${item.shopId}:${item.itemId}`;
  if (seen.has(key)) {
    return;
  }
  seen.add(key);
  out.push({
    ...item,
    itemName: item.itemName || item.itemId,
  });
}

/** Shopee get_item_extra_info + optional name map from get_item_base_info. */
export function parseShopeeOwnItems(
  extraPayload: unknown,
  shopId: string,
  names: ReadonlyMap<string, string> = new Map(),
): OwnShopItem[] {
  const root = asRecord(extraPayload);
  const response = asRecord(root?.response) ?? root;
  const list = response?.item_list;
  if (!Array.isArray(list)) {
    return [];
  }
  const out: OwnShopItem[] = [];
  const seen = new Set<string>();
  for (const raw of list) {
    const row = asRecord(raw);
    if (!row) {
      continue;
    }
    const itemId = readString(row.item_id, row.itemId);
    pushItem(
      out,
      {
        platform: "shopee",
        shopId,
        itemId,
        itemName: names.get(itemId) ?? readString(row.item_name, row.name),
        soldCount: readSold(row.sale, row.sold, row.historical_sold),
      },
      seen,
    );
  }
  return out;
}

export function parseShopeeItemNames(basePayload: unknown): Map<string, string> {
  const map = new Map<string, string>();
  const root = asRecord(basePayload);
  const response = asRecord(root?.response) ?? root;
  const list = response?.item_list;
  if (!Array.isArray(list)) {
    return map;
  }
  for (const raw of list) {
    const row = asRecord(raw);
    if (!row) {
      continue;
    }
    const id = readString(row.item_id, row.itemId);
    const name = readString(row.item_name, row.name);
    if (id && name) {
      map.set(id, name);
    }
  }
  return map;
}

export function parseShopeeItemIds(listPayload: unknown): string[] {
  const root = asRecord(listPayload);
  const response = asRecord(root?.response) ?? root;
  const list = response?.item;
  if (!Array.isArray(list)) {
    return [];
  }
  const out: string[] = [];
  for (const raw of list) {
    const row = asRecord(raw);
    const id = readString(row?.item_id, row?.itemId);
    if (id) {
      out.push(id);
    }
  }
  return out;
}

/** Lazada /products/get products.product[] */
export function parseLazadaOwnItems(payload: unknown, shopId: string): OwnShopItem[] {
  const root = asRecord(payload);
  const data = asRecord(root?.data) ?? root;
  const products = asRecord(data?.products);
  const list = products?.product ?? data?.products;
  const rows = Array.isArray(list) ? list : [];
  const out: OwnShopItem[] = [];
  const seen = new Set<string>();
  for (const raw of rows) {
    const row = asRecord(raw);
    if (!row) {
      continue;
    }
    pushItem(
      out,
      {
        platform: "lazada",
        shopId,
        itemId: readString(row.item_id, row.itemId, row.product_id),
        itemName: readString(row.attributes && asRecord(row.attributes)?.name, row.name),
        soldCount: readSold(row.sold, row.sold_quantity, asRecord(row.skus)?.sold),
      },
      seen,
    );
  }
  return out;
}

/** TikTok Shop product search data.products[] */
export function parseTiktokShopOwnItems(payload: unknown, shopId: string): OwnShopItem[] {
  const root = asRecord(payload);
  const data = asRecord(root?.data) ?? root;
  const list = data?.products ?? data?.product_list;
  if (!Array.isArray(list)) {
    return [];
  }
  const out: OwnShopItem[] = [];
  const seen = new Set<string>();
  for (const raw of list) {
    const row = asRecord(raw);
    if (!row) {
      continue;
    }
    pushItem(
      out,
      {
        platform: "tiktok",
        shopId,
        itemId: readString(row.product_id, row.id, row.item_id),
        itemName: readString(row.title, row.product_name, row.name),
        soldCount: readSold(row.sold_count, row.sales, asRecord(row.skus)?.sold_count),
      },
      seen,
    );
  }
  return out;
}

export function ownShopDateKey(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}
