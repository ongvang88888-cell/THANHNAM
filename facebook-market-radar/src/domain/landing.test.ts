import { describe, expect, it } from "vitest";
import { classifyLanding, parseLandingUrl, safeLandingHref, shopKey } from "./landing";

describe("landing", () => {
  it("classifies shop hosts and empty", () => {
    expect(classifyLanding("https://shopee.vn/den-led-i.123")).toBe("shopee");
    expect(classifyLanding("https://vt.tiktok.com/abc")).toBe("tiktok");
    expect(classifyLanding("https://shop.example.com/p/1")).toBe("web");
    expect(classifyLanding(null)).toBe("none");
    expect(classifyLanding("not-a-url")).toBe("none");
    expect(classifyLanding("javascript:alert(1)")).toBe("none");
  });

  it("accepts http(s) landing and rejects javascript / data", () => {
    expect(parseLandingUrl("https://shopee.vn/shop-den/led")).toBe("https://shopee.vn/shop-den/led");
    expect(parseLandingUrl("")).toBeNull();
    expect(parseLandingUrl(undefined)).toBeNull();
    expect(() => parseLandingUrl("javascript:alert(1)")).toThrow(/http/);
    expect(() => parseLandingUrl("data:text/html,x")).toThrow(/http/);
    expect(() => parseLandingUrl("not-a-url")).toThrow(/http/);
    expect(safeLandingHref("javascript:alert(1)")).toBeNull();
    expect(safeLandingHref("https://example.com/p")).toBe("https://example.com/p");
  });

  it("builds stable shop keys from user-pasted urls", () => {
    expect(shopKey("https://shopee.vn/shop-den-led/abc")).toBe("shopee:shop-den-led");
    expect(shopKey("https://www.tiktok.com/@nhago/video/1")).toBe("tiktok:@nhago");
    expect(shopKey("https://www.example.com/landing")).toBe("web:example.com");
    expect(shopKey(null)).toBeNull();
  });
});
