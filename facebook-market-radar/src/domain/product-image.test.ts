import { describe, expect, it } from "vitest";
import { escapeXml, parseImageUrl, productImagePath, renderProductSvg } from "./product-image";

describe("product image", () => {
  it("builds a local SVG path", () => {
    const path = productImagePath("serum-nia", "Serum Niacinamide", "my-pham");
    expect(path.startsWith("/api/anh-san-pham?")).toBe(true);
    expect(path).toContain("nganh=my-pham");
  });

  it("accepts http(s) and local generator URLs", () => {
    expect(parseImageUrl("https://cdn.example.com/a.jpg")).toBe("https://cdn.example.com/a.jpg");
    expect(parseImageUrl("/api/anh-san-pham?ten=Serum")).toBe("/api/anh-san-pham?ten=Serum");
    expect(parseImageUrl("")).toBeNull();
    expect(parseImageUrl(undefined)).toBeNull();
  });

  it("rejects javascript and other schemes", () => {
    expect(() => parseImageUrl("javascript:alert(1)")).toThrow(/http/);
    expect(() => parseImageUrl("data:text/html,x")).toThrow();
  });

  it("escapes SVG text", () => {
    expect(escapeXml(`<img src="x">`)).toBe("&lt;img src=&quot;x&quot;&gt;");
    const svg = renderProductSvg("<script>", "my-pham");
    expect(svg).toContain("&lt;script&gt;");
    expect(svg).not.toContain("<script>");
  });
});
