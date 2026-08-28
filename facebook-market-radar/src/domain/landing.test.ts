import { describe, expect, it } from "vitest";
import { classifyLanding, shopKey } from "./landing";

describe("landing", () => {
  it("classifies shop hosts and empty", () => {
    expect(classifyLanding("https://shopee.vn/den-led-i.123")).toBe("shopee");
    expect(classifyLanding("https://vt.tiktok.com/abc")).toBe("tiktok");
    expect(classifyLanding("https://shop.example.com/p/1")).toBe("web");
    expect(classifyLanding(null)).toBe("none");
    expect(classifyLanding("not-a-url")).toBe("none");
  });

  it("builds stable shop keys from user-pasted urls", () => {
    expect(shopKey("https://shopee.vn/shop-den-led/abc")).toBe("shopee:shop-den-led");
    expect(shopKey("https://www.tiktok.com/@nhago/video/1")).toBe("tiktok:@nhago");
    expect(shopKey("https://www.example.com/landing")).toBe("web:example.com");
    expect(shopKey(null)).toBeNull();
  });
});
