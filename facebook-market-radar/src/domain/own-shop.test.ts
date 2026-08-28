import { describe, expect, it } from "vitest";
import {
  parseLazadaOwnItems,
  parseShopeeItemIds,
  parseShopeeItemNames,
  parseShopeeOwnItems,
  parseTiktokShopOwnItems,
} from "./own-shop";

describe("own-shop official JSON parsers", () => {
  it("reads Shopee extra_info sale without inventing competitor GMV", () => {
    const names = parseShopeeItemNames({
      response: { item_list: [{ item_id: 11, item_name: "Serum shop mình" }] },
    });
    expect(parseShopeeItemIds({ response: { item: [{ item_id: 11 }] } })).toEqual(["11"]);
    const items = parseShopeeOwnItems(
      { response: { item_list: [{ item_id: 11, sale: 4 }] } },
      "99",
      names,
    );
    expect(items).toEqual([
      { platform: "shopee", shopId: "99", itemId: "11", itemName: "Serum shop mình", soldCount: 4 },
    ]);
  });

  it("reads Lazada and TikTok own catalogs", () => {
    expect(
      parseLazadaOwnItems(
        { data: { products: { product: [{ item_id: "L1", attributes: { name: "Kem" }, sold: 2 }] } } },
        "shop-l",
      ),
    ).toEqual([{ platform: "lazada", shopId: "shop-l", itemId: "L1", itemName: "Kem", soldCount: 2 }]);
    expect(
      parseTiktokShopOwnItems({ data: { products: [{ product_id: "T1", title: "Son", sold_count: 7 }] } }, "s1"),
    ).toEqual([{ platform: "tiktok", shopId: "s1", itemId: "T1", itemName: "Son", soldCount: 7 }]);
  });
});
