import { describe, expect, it } from "vitest";
import { detectCreativeAngles, hookLine, mediaType } from "./creative-angles";

describe("creative-angles", () => {
  it("detects price / combo / official / shipping hooks from copy", () => {
    const angles = detectCreativeAngles([
      "Serum chính hãng — combo 2 hộp, freeship nội thành, giá sốc chỉ 189k",
    ]);
    expect(angles).toEqual(expect.arrayContaining(["price", "combo", "official", "shipping"]));
  });

  it("detects UGC and before-after", () => {
    expect(detectCreativeAngles(["Mình dùng 2 tuần, trước sau rõ"])).toEqual(
      expect.arrayContaining(["ugc", "before_after"]),
    );
  });

  it("builds a short hook line and media type", () => {
    expect(hookLine([null, "Kem chống nắng SPF50 — chỉ 249.000đ hôm nay"])).toContain("Kem chống nắng");
    expect(mediaType("https://img.example/a.jpg")).toBe("image");
    expect(mediaType(null)).toBe("text");
  });
});
